/**
 * E2E do feed e do resultado:
 *   - GET /customers/:id/social/feed
 *   - GET /customers/:id/social/posts/:postId/metrics
 *
 * O motor entra dublado. Interessa aqui a camada HTTP e, sobretudo, a recusa de
 * ler métrica de post que não é deste cliente.
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
  ListQueueInput,
  PostMetrics,
  QueuedPost,
} from '@/domain/social/application/gateways/i-social-engine.gateway'

let app: INestApplication
let employeeToken: string
let seedPrisma: PrismaClient

const LINKED = 'e2e-feed-linked'
const UNLINKED = 'e2e-feed-unlinked'

const post = (
  id: string,
  at: string,
  state: string,
  groupId: string,
): QueuedPost & { groupId: string } => ({
  id,
  content: `post ${id}`,
  publishAt: new Date(at),
  state,
  url: state === 'PUBLISHED' ? `https://instagram.com/p/${id}` : null,
  channelId: 'c1',
  channelName: '@padariadoze',
  provider: 'instagram',
  group: null,
  groupId,
})

const engineQueue = [
  post('saiu-antes', '2026-09-02T10:00:00.000Z', 'PUBLISHED', 'g1'),
  post('saiu-depois', '2026-09-10T10:00:00.000Z', 'PUBLISHED', 'g1'),
  post('falhou', '2026-09-08T10:00:00.000Z', 'ERROR', 'g1'),
  post('na-fila', '2026-09-30T10:00:00.000Z', 'QUEUE', 'g1'),
  post('de-outro', '2026-09-09T10:00:00.000Z', 'PUBLISHED', 'g-outro'),
]

const fakeEngine: ISocialEngineGateway = {
  isConfigured: () => true,
  listGroups: async () => [{ id: 'g1', name: 'Padaria' }],
  listChannels: async () => [],
  publish: async () => [],
  cancelPost: async () => {},
  listQueue: async (input: ListQueueInput) =>
    engineQueue.filter(
      (p) =>
        (!input.groupId || p.groupId === input.groupId) &&
        p.publishAt >= input.from &&
        p.publishAt <= input.to,
    ),
  getPostMetrics: async (postId: string): Promise<PostMetrics> =>
    postId === 'saiu-depois'
      ? { available: true, metrics: [{ label: 'Reach', total: 1240, percentageChange: 12 }] }
      : { available: false, metrics: [] },
}

const auth = () => ({ Authorization: `Bearer ${employeeToken}` })
const WINDOW = '?from=2026-09-01T00:00:00.000Z&to=2026-09-20T00:00:00.000Z'

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
    .send({ email: 'emp@feed.com', password: 'Employee123@', name: 'Employee', role: 'employee' })

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'emp@feed.com', password: 'Employee123@' })
  employeeToken = (login.body as { accessToken: string }).accessToken

  await seedPrisma.customer.create({
    data: {
      id: LINKED,
      name: 'Padaria do Zé',
      email: 'feed-linked@example.com',
      status: 'active',
      createdByUserId: 'seed-user',
      postizGroupId: 'g1',
    },
  })
  await seedPrisma.customer.create({
    data: {
      id: UNLINKED,
      name: 'Bar do João',
      email: 'feed-unlinked@example.com',
      status: 'active',
      createdByUserId: 'seed-user',
    },
  })
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

describe('Feed e resultado (E2E)', () => {
  it('exige autenticação', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/customers/${LINKED}/social/feed`)
      .expect(401)
  })

  it('recusa com 409 cliente sem grupo ligado', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/customers/${UNLINKED}/social/feed`)
      .set(auth())
      .expect(409)
  })

  it('traz só o que saiu, do mais recente para o mais antigo', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${LINKED}/social/feed${WINDOW}`)
      .set(auth())
      .expect(200)

    // 'na-fila' fica de fora (pertence à agenda); 'falhou' entra.
    expect(res.body.posts.map((p: { id: string }) => p.id)).toEqual([
      'saiu-depois',
      'falhou',
      'saiu-antes',
    ])
  })

  it('não mistura post de outro cliente', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${LINKED}/social/feed${WINDOW}`)
      .set(auth())
      .expect(200)

    expect(res.body.posts.map((p: { id: string }) => p.id)).not.toContain('de-outro')
  })

  it('devolve a métrica de um post do cliente', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${LINKED}/social/posts/saiu-depois/metrics`)
      .set(auth())
      .expect(200)

    expect(res.body.available).toBe(true)
    expect(res.body.metrics[0]).toEqual({ label: 'Reach', total: 1240, percentageChange: 12 })
  })

  it('responde indisponível, e não zero, quando a rede não informa', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${LINKED}/social/posts/falhou/metrics`)
      .set(auth())
      .expect(200)

    expect(res.body.available).toBe(false)
    expect(res.body.metrics).toEqual([])
  })

  it('recusa com 404 ler métrica de post de outro cliente', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/customers/${LINKED}/social/posts/de-outro/metrics`)
      .set(auth())
      .expect(404)
  })

  it('recusa com 404 cliente inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers/nao-existe/social/feed')
      .set(auth())
      .expect(404)
  })
})
