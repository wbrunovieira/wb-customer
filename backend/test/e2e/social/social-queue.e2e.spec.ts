/**
 * E2E da fila:
 *   - GET    /customers/:id/social/queue
 *   - DELETE /customers/:id/social/queue/:postId
 *
 * O motor entra dublado. O que importa aqui é a camada HTTP e, sobretudo, a
 * recusa de cancelar post que não é deste cliente.
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
  QueuedPost,
} from '@/domain/social/application/gateways/i-social-engine.gateway'

let app: INestApplication
let employeeToken: string
let seedPrisma: PrismaClient

const LINKED = 'e2e-queue-linked'
const UNLINKED = 'e2e-queue-unlinked'

const post = (id: string, at: string, groupId: string): QueuedPost & { groupId: string } => ({
  id,
  content: `post ${id}`,
  publishAt: new Date(at),
  state: 'QUEUE',
  url: null,
  channelId: 'c1',
  channelName: '@padariadoze',
  provider: 'instagram',
  group: null,
  groupId,
})

// A fila do motor inteira; o dublê filtra por grupo como o motor faz.
let engineQueue = [
  post('p-tarde', '2026-09-25T10:00:00.000Z', 'g1'),
  post('p-cedo', '2026-09-20T10:00:00.000Z', 'g1'),
  post('p-de-outro', '2026-09-21T10:00:00.000Z', 'g-outro'),
]

const fakeEngine: ISocialEngineGateway = {
  isConfigured: () => true,
  getPostMetrics: async () => ({ available: false, metrics: [] }),
  listGroups: async () => [{ id: 'g1', name: 'Padaria' }],
  listChannels: async () => [],
  publish: async () => [],
  listQueue: async (input: ListQueueInput) =>
    engineQueue.filter(
      (p) =>
        (!input.groupId || p.groupId === input.groupId) &&
        p.publishAt >= input.from &&
        p.publishAt <= input.to,
    ),
  cancelPost: async (postId: string) => {
    engineQueue = engineQueue.filter((p) => p.id !== postId)
  },
}

const auth = () => ({ Authorization: `Bearer ${employeeToken}` })
const WINDOW = '?from=2026-09-01T00:00:00.000Z&to=2026-10-01T00:00:00.000Z'

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
    .send({ email: 'emp@queue.com', password: 'Employee123@', name: 'Employee', role: 'employee' })

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'emp@queue.com', password: 'Employee123@' })
  employeeToken = (login.body as { accessToken: string }).accessToken

  await seedPrisma.customer.create({
    data: {
      id: LINKED,
      name: 'Padaria do Zé',
      email: 'queue-linked@example.com',
      status: 'active',
      createdByUserId: 'seed-user',
      postizGroupId: 'g1',
    },
  })
  await seedPrisma.customer.create({
    data: {
      id: UNLINKED,
      name: 'Bar do João',
      email: 'queue-unlinked@example.com',
      status: 'active',
      createdByUserId: 'seed-user',
    },
  })
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

describe('Fila do motor (E2E)', () => {
  it('exige autenticação', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/customers/${LINKED}/social/queue`)
      .expect(401)
  })

  it('recusa com 409 cliente sem grupo ligado', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/customers/${UNLINKED}/social/queue`)
      .set(auth())
      .expect(409)
  })

  it('recusa com 400 janela com início depois do fim', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/customers/${LINKED}/social/queue?from=2026-10-01T00:00:00.000Z&to=2026-09-01T00:00:00.000Z`)
      .set(auth())
      .expect(400)
  })

  it('lista só os posts do grupo do cliente, em ordem cronológica', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${LINKED}/social/queue${WINDOW}`)
      .set(auth())
      .expect(200)

    expect(res.body.posts.map((p: { id: string }) => p.id)).toEqual(['p-cedo', 'p-tarde'])
  })

  it('recusa com 404 cancelar post que não é deste cliente', async () => {
    // O motor aceitaria o id sozinho; a recusa tem de vir daqui.
    await request(app.getHttpServer())
      .delete(`/api/v1/customers/${LINKED}/social/queue/p-de-outro`)
      .set(auth())
      .expect(404)
  })

  it('cancela post da fila do cliente', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/customers/${LINKED}/social/queue/p-tarde`)
      .set(auth())
      .expect(200)

    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${LINKED}/social/queue${WINDOW}`)
      .set(auth())
      .expect(200)

    expect(res.body.posts.map((p: { id: string }) => p.id)).toEqual(['p-cedo'])
  })

  it('recusa com 404 cliente inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers/nao-existe/social/queue')
      .set(auth())
      .expect(404)
  })
})
