import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupE2E, teardownE2E } from '../../setup-e2e'
import { AppModule } from '@/app.module'

let app: INestApplication
let adminToken: string
let customerId: string
let seedPrisma: PrismaClient

beforeAll(async () => {
  const { prisma } = await setupE2E()
  seedPrisma = prisma

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  await app.init()

  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: 'admin@activities.com', password: 'Admin123@', name: 'Admin', role: 'admin' })

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'admin@activities.com', password: 'Admin123@' })
  adminToken = (login.body as { accessToken: string }).accessToken

  // Seed customer directly — bypass Google Drive
  const customer = await seedPrisma.customer.create({
    data: {
      id: 'e2e-customer-activities',
      name: 'Activities Corp',
      email: 'activities@example.com',
      status: 'active',
      createdByUserId: 'seed-user',
    },
  })
  customerId = customer.id

})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

// ─────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────

describe('POST /api/v1/customers/:customerId/activities', () => {
  it('should create a note activity', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/activities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'note', subject: 'First contact', description: 'Called to say hello' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('activityId')
  })

  it('should create a scheduled phone_call activity', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/activities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'phone_call',
        status: 'scheduled',
        subject: 'Onboarding call',
        scheduledAt: '2026-05-01T10:00:00Z',
        direction: 'outbound',
      })

    expect(res.status).toBe(201)
    const body = res.body as { activityId: string }
    expect(body.activityId).toBeTruthy()
  })

  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/activities`)
      .send({ type: 'note' })

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────
// LIST
// ─────────────────────────────────────────

describe('GET /api/v1/customers/:customerId/activities', () => {
  beforeAll(async () => {
    // Self-sufficient seed — create 2 activities of different types/statuses
    await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/activities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'note', subject: 'List seed note', status: 'open' })
    await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/activities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'phone_call', subject: 'List seed call', status: 'scheduled', scheduledAt: '2026-05-01T10:00:00Z' })
  })

  it('should list all activities for a customer', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/activities`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { items: unknown[]; total: number }
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.total).toBeGreaterThanOrEqual(2)
  })

  it('should filter activities by type', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/activities?type=note`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { items: { type: string }[]; total: number }
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.items.every((a) => a.type === 'note')).toBe(true)
  })

  it('should filter activities by status', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/activities?status=scheduled`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { items: { status: string }[]; total: number }
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.items.every((a) => a.status === 'scheduled')).toBe(true)
  })

  it('should paginate results', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/activities?page=1&limit=1`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { items: unknown[]; total: number }
    expect(body.items).toHaveLength(1)
    expect(body.total).toBeGreaterThanOrEqual(2)
  })
})

// ─────────────────────────────────────────
// GET SINGLE
// ─────────────────────────────────────────

describe('GET /api/v1/customers/:customerId/activities/:activityId', () => {
  let activityId: string

  beforeAll(async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/activities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'email', subject: 'Proposal sent', direction: 'outbound' })
    activityId = (res.body as { activityId: string }).activityId
  })

  it('should return a single activity', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/activities/${activityId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { activity: { id: string; type: string; subject: string } }
    expect(body.activity.id).toBe(activityId)
    expect(body.activity.type).toBe('email')
    expect(body.activity.subject).toBe('Proposal sent')
  })

  it('should return 404 for non-existent activity', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/activities/non-existent-id`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────

describe('PATCH /api/v1/customers/:customerId/activities/:activityId', () => {
  let activityId: string

  beforeAll(async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/activities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'whatsapp', subject: 'Sent proposal via WhatsApp', status: 'open' })
    activityId = (res.body as { activityId: string }).activityId
  })

  it('should update activity status to done', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/activities/${activityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'done', occurredAt: '2026-04-15T14:00:00Z' })

    expect(res.status).toBe(200)
    expect((res.body as { activityId: string }).activityId).toBe(activityId)
  })

  it('should update description and subject', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/activities/${activityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subject: 'Updated subject', description: 'Client confirmed' })

    expect(res.status).toBe(200)
  })

  it('should return 404 for non-existent activity', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/activities/non-existent-id`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'done' })

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────

describe('DELETE /api/v1/customers/:customerId/activities/:activityId', () => {
  let activityId: string

  beforeAll(async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/activities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'note', subject: 'To be deleted' })
    activityId = (res.body as { activityId: string }).activityId
  })

  it('should soft-delete an activity (204)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/activities/${activityId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)
  })

  it('should return 404 after deletion', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/activities/${activityId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })

  it('should return 404 for non-existent activity', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/activities/non-existent-id`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})
