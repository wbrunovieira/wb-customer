/**
 * E2E da publicação:
 *   - POST /customers/:id/social/publications
 *   - GET  /customers/:id/social/publications
 *
 * O motor entra dublado. O que se testa aqui é a camada HTTP: os códigos de
 * recusa, o corpo com as violações e a publicação gravada de verdade no banco.
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
  PublishInput,
  PublishedTarget,
  SocialChannel,
} from '@/domain/social/application/gateways/i-social-engine.gateway'

let app: INestApplication
let employeeToken: string
let seedPrisma: PrismaClient

const LINKED = 'e2e-pub-linked'
const UNLINKED = 'e2e-pub-unlinked'
const FUTURE = '2027-01-15T13:00:00.000Z'

const channel = (id: string, groupId: string | null, disabled = false): SocialChannel => ({
  id,
  name: `canal ${id}`,
  provider: id.includes('face') ? 'facebook' : 'instagram',
  disabled,
  groupId,
})

const fakeEngine: ISocialEngineGateway = {
  isConfigured: () => true,
  getPostMetrics: async () => ({ available: false, metrics: [] }),
  listQueue: async () => [],
  cancelPost: async () => {},
  listGroups: async () => [{ id: 'g1', name: 'Padaria' }],
  listChannels: async (): Promise<SocialChannel[]> => [
    channel('c-insta', 'g1'),
    channel('c-face', 'g1'),
    channel('c-off', 'g1', true),
    channel('c-outro', 'g-outro'),
  ],
  publish: async (input: PublishInput): Promise<PublishedTarget[]> =>
    input.channelIds.map((channelId) => ({ channelId, postId: `postiz-${channelId}` })),
}

const auth = () => ({ Authorization: `Bearer ${employeeToken}` })

const publish = (customerId: string, body: Record<string, unknown>) =>
  request(app.getHttpServer())
    .post(`/api/v1/customers/${customerId}/social/publications`)
    .set(auth())
    .send(body)

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
    .send({ email: 'emp@pub.com', password: 'Employee123@', name: 'Employee', role: 'employee' })

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'emp@pub.com', password: 'Employee123@' })
  employeeToken = (login.body as { accessToken: string }).accessToken

  await seedPrisma.customer.create({
    data: {
      id: LINKED,
      name: 'Padaria do Zé',
      email: 'pub-linked@example.com',
      status: 'active',
      createdByUserId: 'seed-user',
      postizGroupId: 'g1',
    },
  })
  await seedPrisma.customer.create({
    data: {
      id: UNLINKED,
      name: 'Bar do João',
      email: 'pub-unlinked@example.com',
      status: 'active',
      createdByUserId: 'seed-user',
    },
  })
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

describe('Publicação nas redes (E2E)', () => {
  it('exige autenticação', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/customers/${LINKED}/social/publications`)
      .send({ content: 'oi', channelIds: ['c-insta'], mode: 'now' })
      .expect(401)
  })

  it('recusa com 409 cliente sem grupo ligado', async () => {
    await publish(UNLINKED, { content: 'oi', channelIds: ['c-insta'], mode: 'now' }).expect(409)
  })

  it('recusa com 422 o texto que fere as regras da casa', async () => {
    const res = await publish(LINKED, {
      content: 'Pão quentinho — a partir de R$ 5',
      channelIds: ['c-insta'],
      mode: 'now',
    }).expect(422)

    // O corpo traz o trecho e a posição porque a tela precisa destacar.
    expect(res.body.violations.length).toBeGreaterThan(0)
    expect(res.body.violations[0]).toHaveProperty('index')
  })

  it('recusa com 400 canal de outro grupo', async () => {
    await publish(LINKED, {
      content: 'Encomende pelo WhatsApp',
      channelIds: ['c-outro'],
      mode: 'now',
    }).expect(400)
  })

  it('recusa com 400 canal desativado', async () => {
    await publish(LINKED, {
      content: 'Encomende pelo WhatsApp',
      channelIds: ['c-off'],
      mode: 'now',
    }).expect(400)
  })

  it('recusa com 400 agendamento para o passado', async () => {
    await publish(LINKED, {
      content: 'Encomende pelo WhatsApp',
      channelIds: ['c-insta'],
      mode: 'schedule',
      scheduledFor: '2020-01-01T10:00:00.000Z',
    }).expect(400)
  })

  it('agenda em vários canais e grava um id de post por canal', async () => {
    const res = await publish(LINKED, {
      content: 'Encomende sua peça pelo WhatsApp. [ref: K7MQ2A]',
      channelIds: ['c-insta', 'c-face'],
      mode: 'schedule',
      scheduledFor: FUTURE,
      attributionLinkId: null,
    }).expect(201)

    expect(res.body.targets).toHaveLength(2)
    expect(res.body.targets.map((t: { postizPostId: string }) => t.postizPostId).sort()).toEqual([
      'postiz-c-face',
      'postiz-c-insta',
    ])

    const saved = await seedPrisma.socialPublication.findUnique({
      where: { id: res.body.publicationId },
      include: { targets: true },
    })
    expect(saved?.postizGroupId).toBe('g1')
    expect(saved?.targets).toHaveLength(2)
  })

  it('lista as publicações do cliente', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${LINKED}/social/publications`)
      .set(auth())
      .expect(200)

    expect(res.body.publications).toHaveLength(1)
    expect(res.body.publications[0].targets).toHaveLength(2)
  })

  it('não lista publicação de outro cliente', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${UNLINKED}/social/publications`)
      .set(auth())
      .expect(200)

    expect(res.body.publications).toEqual([])
  })

  it('recusa com 404 cliente inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers/nao-existe/social/publications')
      .set(auth())
      .expect(404)
  })
})
