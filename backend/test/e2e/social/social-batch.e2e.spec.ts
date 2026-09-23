/**
 * E2E do lote:
 *   - POST /customers/:id/social/publications/batch
 *
 * O que importa aqui é a promessa central da rota: um item ruim não derruba o
 * lote, e a resposta diz pela posição enviada o que entrou e o que não entrou.
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
} from '@/domain/social/application/gateways/i-social-engine.gateway'

let app: INestApplication
let employeeToken: string
let seedPrisma: PrismaClient

const CUSTOMER = 'e2e-batch-customer'
const FUTURE = '2027-02-10T13:00:00.000Z'

const fakeEngine: ISocialEngineGateway = {
  isConfigured: async () => true,
  listGroups: async () => [{ id: 'g1', name: 'Padaria' }],
  listChannels: async () => [
    { id: 'c1', name: '@padariadoze', provider: 'instagram', disabled: false, groupId: 'g1' },
  ],
  publish: async (input: PublishInput) =>
    input.channels.map((channel) => ({
      channelId: channel.id,
      postId: `postiz-${channel.id}-${Math.random().toString(36).slice(2, 8)}`,
    })),
  listQueue: async () => [],
  cancelPost: async () => {},
  getPostMetrics: async () => ({ available: false, metrics: [] }),
  uploadMedia: async () => ({ id: 'm1', path: 'https://motor.example/m.png' }),
}

const auth = () => ({ Authorization: `Bearer ${employeeToken}` })

const post = (content: string) => ({
  content,
  channelIds: ['c1'],
  mode: 'schedule',
  scheduledFor: FUTURE,
})

const sendBatch = (posts: unknown[]) =>
  request(app.getHttpServer())
    .post(`/api/v1/customers/${CUSTOMER}/social/publications/batch`)
    .set(auth())
    .send({ posts })

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
    .send({ email: 'emp@batch.com', password: 'Employee123@', name: 'Employee', role: 'employee' })

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'emp@batch.com', password: 'Employee123@' })
  employeeToken = (login.body as { accessToken: string }).accessToken

  await seedPrisma.customer.create({
    data: {
      id: CUSTOMER,
      name: 'Padaria do Zé',
      email: 'batch@example.com',
      status: 'active',
      createdByUserId: 'seed-user',
      postizGroupId: 'g1',
    },
  })
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

describe('Calendário em lote (E2E)', () => {
  it('exige autenticação', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/customers/${CUSTOMER}/social/publications/batch`)
      .send({ posts: [post('Oi')] })
      .expect(401)
  })

  it('recusa com 400 lote vazio', async () => {
    await sendBatch([]).expect(400)
  })

  it('recusa com 400 lote acima do teto de requisições', async () => {
    // O teto é medido em requisições ao motor, que concede 90 por hora.
    await sendBatch(Array.from({ length: 71 }, () => post('Encomende pelo WhatsApp'))).expect(400)
  })

  it('conta as imagens no custo, e não só os posts', async () => {
    // Vinte posts passariam por contagem; com cinco imagens cada, custam 120
    // requisições e não cabem.
    const comCarrossel = Array.from({ length: 20 }, () => ({
      ...post('Carrossel da semana'),
      creativeIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
    }))

    await sendBatch(comCarrossel).expect(400)
  })

  it('agenda o lote inteiro e grava cada publicação', async () => {
    const res = await sendBatch([
      post('Encomende sua peça pelo WhatsApp'),
      post('Novidade da semana no ateliê'),
    ]).expect(201)

    expect(res.body).toMatchObject({ total: 2, scheduled: 2, rejected: 0 })

    const saved = await seedPrisma.socialPublication.count({ where: { customerId: CUSTOMER } })
    expect(saved).toBe(2)
  })

  it('um item ruim não derruba o lote, e a resposta diz qual caiu', async () => {
    const before = await seedPrisma.socialPublication.count({ where: { customerId: CUSTOMER } })

    const res = await sendBatch([
      post('Peça a sua pelo WhatsApp'),
      post('Pão quentinho — a partir de R$ 5'),
      post('Atendemos por encomenda'),
    ]).expect(201)

    expect(res.body).toMatchObject({ total: 3, scheduled: 2, rejected: 1 })

    const rejected = res.body.results.filter((r: { status: string }) => r.status === 'rejected')
    expect(rejected).toHaveLength(1)
    expect(rejected[0].index).toBe(1)
    expect(rejected[0].violations.length).toBeGreaterThan(0)

    const after = await seedPrisma.socialPublication.count({ where: { customerId: CUSTOMER } })
    expect(after - before).toBe(2)
  })

  it('mantém a ordem enviada nos resultados', async () => {
    const res = await sendBatch([
      post('Primeiro'),
      post('Segundo'),
      post('Terceiro'),
    ]).expect(201)

    expect(res.body.results.map((r: { index: number }) => r.index)).toEqual([0, 1, 2])
  })

  it('recusa com 404 cliente inexistente', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/customers/nao-existe/social/publications/batch')
      .set(auth())
      .send({ posts: [post('Oi')] })
      .expect(404)
  })
})
