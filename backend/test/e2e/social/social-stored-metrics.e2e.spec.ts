/**
 * E2E das métricas guardadas:
 *   - GET /customers/:id/social/metrics
 *
 * Lê do nosso banco, não do motor. O ponto aqui é que campo nulo signifique
 * "a rede não informou", e não zero.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupE2E, teardownE2E } from '../../setup-e2e'
import { AppModule } from '@/app.module'

let app: INestApplication
let employeeToken: string
let seedPrisma: PrismaClient

const CUSTOMER = 'e2e-metrics-customer'
const OTHER = 'e2e-metrics-other'

const auth = () => ({ Authorization: `Bearer ${employeeToken}` })

beforeAll(async () => {
  const { prisma } = await setupE2E()
  seedPrisma = prisma

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  await app.init()

  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: 'emp@metrics.com', password: 'Employee123@', name: 'Employee', role: 'employee' })

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'emp@metrics.com', password: 'Employee123@' })
  employeeToken = (login.body as { accessToken: string }).accessToken

  for (const [id, email] of [
    [CUSTOMER, 'metrics@example.com'],
    [OTHER, 'metrics-other@example.com'],
  ]) {
    await seedPrisma.customer.create({
      data: { id, name: id, email, status: 'active', createdByUserId: 'seed-user' },
    })
  }

  await seedPrisma.socialPostMetric.create({
    data: {
      postizPostId: 'post-do-cliente',
      customerId: CUSTOMER,
      provider: 'instagram',
      reach: 2870,
      likes: 154,
      // views, comments, shares e saves ficam nulos de propósito.
      raw: [{ label: 'Reach', total: 2870, percentageChange: 12 }],
    },
  })

  await seedPrisma.socialPostMetric.create({
    data: {
      postizPostId: 'post-de-outro',
      customerId: OTHER,
      provider: 'instagram',
      reach: 10,
      raw: [],
    },
  })
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

describe('Métricas guardadas (E2E)', () => {
  it('exige autenticação', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/customers/${CUSTOMER}/social/metrics`)
      .expect(401)
  })

  it('devolve as métricas do cliente', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${CUSTOMER}/social/metrics`)
      .set(auth())
      .expect(200)

    expect(res.body.metrics).toHaveLength(1)
    expect(res.body.metrics[0]).toMatchObject({
      postizPostId: 'post-do-cliente',
      provider: 'instagram',
      reach: 2870,
      likes: 154,
    })
  })

  it('devolve nulo, e não zero, no que a rede não informou', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${CUSTOMER}/social/metrics`)
      .set(auth())
      .expect(200)

    expect(res.body.metrics[0].saves).toBeNull()
    expect(res.body.metrics[0].views).toBeNull()
  })

  it('não mistura métrica de outro cliente', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${CUSTOMER}/social/metrics`)
      .set(auth())
      .expect(200)

    expect(
      res.body.metrics.map((m: { postizPostId: string }) => m.postizPostId),
    ).not.toContain('post-de-outro')
  })

  it('devolve lista vazia para cliente sem métrica', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${OTHER}/social/metrics`)
      .set(auth())
      .expect(200)

    expect(res.body.metrics).toHaveLength(1)
  })

  it('recusa com 404 cliente inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers/nao-existe/social/metrics')
      .set(auth())
      .expect(404)
  })
})
