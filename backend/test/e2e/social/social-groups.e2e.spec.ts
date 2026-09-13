/**
 * E2E do vínculo com o motor de publicação:
 *   - GET /social/groups
 *   - PUT /customers/:id/social/group
 *   - GET /customers/:id/social/channels
 *
 * O motor (Postiz) entra dublado: o que se testa aqui é a camada HTTP —
 * autenticação, códigos de status e o vínculo gravado de verdade no banco.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupE2E, teardownE2E } from '../../setup-e2e'
import { AppModule } from '@/app.module'
import {
  ISocialEngineGateway,
  SocialChannel,
  SocialGroup,
} from '@/domain/social/application/gateways/i-social-engine.gateway'

let app: INestApplication
let employeeToken: string
let seedPrisma: PrismaClient

const CUSTOMER = 'e2e-social-customer'
const OTHER = 'e2e-social-other'

const channel = (id: string, groupId: string | null): SocialChannel => ({
  id,
  name: `canal ${id}`,
  provider: 'instagram',
  disabled: false,
  groupId,
})

const fakeEngine: ISocialEngineGateway = {
  isConfigured: () => true,
  listQueue: async () => [],
  cancelPost: async () => {},
  publish: async () => [],
  listGroups: async (): Promise<SocialGroup[]> => [{ id: 'g1', name: 'Padaria' }],
  listChannels: async (): Promise<SocialChannel[]> => [
    channel('c1', 'g1'),
    channel('c2', 'g2'),
    channel('c3', null),
  ],
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

beforeAll(async () => {
  const { prisma } = await setupE2E()
  seedPrisma = prisma

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ISocialEngineGateway)
    .useValue(fakeEngine)
    .compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  await app.init()

  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: 'emp@social.com', password: 'Employee123@', name: 'Employee', role: 'employee' })

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'emp@social.com', password: 'Employee123@' })
  employeeToken = (login.body as { accessToken: string }).accessToken

  for (const [id, name, email] of [
    [CUSTOMER, 'Padaria do Zé', 'padaria@example.com'],
    [OTHER, 'Bar do João', 'bar@example.com'],
  ]) {
    await seedPrisma.customer.create({
      data: { id, name, email, status: 'active', createdByUserId: 'seed-user' },
    })
  }
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

describe('Vínculo com o motor de publicação (E2E)', () => {
  it('exige autenticação', async () => {
    await request(app.getHttpServer()).get('/api/v1/social/groups').expect(401)
  })

  it('lista os grupos com a contagem de canais', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/social/groups')
      .set(auth(employeeToken))
      .expect(200)

    expect(res.body.groups).toHaveLength(1)
    expect(res.body.groups[0]).toMatchObject({
      id: 'g1',
      name: 'Padaria',
      channels: 1,
      linkedCustomerId: null,
    })
  })

  it('recusa grupo que não existe no motor', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/customers/${CUSTOMER}/social/group`)
      .set(auth(employeeToken))
      .send({ groupId: 'fantasma' })
      .expect(404)
  })

  it('grava o vínculo', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/customers/${CUSTOMER}/social/group`)
      .set(auth(employeeToken))
      .send({ groupId: 'g1' })
      .expect(200)

    expect(res.body).toMatchObject({ postizGroupId: 'g1', groupName: 'Padaria' })

    const saved = await seedPrisma.customer.findUnique({ where: { id: CUSTOMER } })
    expect(saved?.postizGroupId).toBe('g1')
  })

  it('passa a mostrar o grupo como ocupado', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/social/groups')
      .set(auth(employeeToken))
      .expect(200)

    expect(res.body.groups[0]).toMatchObject({
      linkedCustomerId: CUSTOMER,
      linkedCustomerName: 'Padaria do Zé',
    })
  })

  it('recusa com 409 ligar o mesmo grupo a outro cliente', async () => {
    // Dois clientes no mesmo grupo publicariam na mesma conta social.
    await request(app.getHttpServer())
      .put(`/api/v1/customers/${OTHER}/social/group`)
      .set(auth(employeeToken))
      .send({ groupId: 'g1' })
      .expect(409)
  })

  it('devolve só os canais do grupo do cliente', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${CUSTOMER}/social/channels`)
      .set(auth(employeeToken))
      .expect(200)

    expect(res.body.linked).toBe(true)
    expect(res.body.channels.map((c: SocialChannel) => c.id)).toEqual(['c1'])
  })

  it('responde linked=false para cliente ainda sem vínculo', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${OTHER}/social/channels`)
      .set(auth(employeeToken))
      .expect(200)

    expect(res.body.linked).toBe(false)
    expect(res.body.channels).toEqual([])
  })

  it('desfaz o vínculo com groupId null', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/customers/${CUSTOMER}/social/group`)
      .set(auth(employeeToken))
      .send({ groupId: null })
      .expect(200)

    const saved = await seedPrisma.customer.findUnique({ where: { id: CUSTOMER } })
    expect(saved?.postizGroupId).toBeNull()
  })

  it('recusa cliente inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers/nao-existe/social/channels')
      .set(auth(employeeToken))
      .expect(404)
  })
})
