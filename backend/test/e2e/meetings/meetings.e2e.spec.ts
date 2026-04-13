import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { setupE2E, teardownE2E } from '../../setup-e2e'
import { AppModule } from '@/app.module'

let app: INestApplication
let adminToken: string
let customerId: string
let meetingId: string
let meetingTypeId: string

beforeAll(async () => {
  await setupE2E()

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  await app.init()

  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: 'admin@meetings.com', password: 'Admin123@', name: 'Admin', role: 'admin' })

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'admin@meetings.com', password: 'Admin123@' })
  adminToken = (login.body as { accessToken: string }).accessToken

  const customerRes = await request(app.getHttpServer())
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Acme Corp', email: 'acme@meetings.com' })
  customerId = (customerRes.body as { customerId: string }).customerId
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

// ─────────────────────────────────────────
// MEETING TYPES
// ─────────────────────────────────────────

describe('POST /api/v1/meeting-types', () => {
  it('should create a meeting type', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/meeting-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Discovery Call', durationMinutes: 60 })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('meetingTypeId')
    meetingTypeId = (res.body as { meetingTypeId: string }).meetingTypeId
  })

  it('should return 409 for duplicate meeting type name', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/meeting-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Discovery Call' })

    expect(res.status).toBe(409)
  })
})

describe('GET /api/v1/meeting-types', () => {
  it('should list meeting types', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/meeting-types')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('meetingTypes')
    const body = res.body as { meetingTypes: unknown[] }
    expect(body.meetingTypes.length).toBeGreaterThan(0)
  })
})

describe('PATCH /api/v1/meeting-types/:id', () => {
  it('should update a meeting type', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/meeting-types/${meetingTypeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ durationMinutes: 45 })

    expect(res.status).toBe(200)
  })

  it('should return 404 for unknown meeting type', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/meeting-types/non-existent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated' })

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────
// MEETINGS
// ─────────────────────────────────────────

describe('POST /api/v1/customers/:id/meetings', () => {
  it('should schedule a meeting', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/meetings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Kickoff',
        startAt: '2026-06-01T10:00:00Z',
        endAt: '2026-06-01T11:00:00Z',
        attendeeEmails: ['client@company.com'],
        meetingTypeId,
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('meetingId')
    meetingId = (res.body as { meetingId: string }).meetingId
  })

  it('should return 404 for unknown customer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers/unknown/meetings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test',
        startAt: '2026-06-01T10:00:00Z',
        endAt: '2026-06-01T11:00:00Z',
        attendeeEmails: [],
      })

    expect(res.status).toBe(404)
  })
})

describe('GET /api/v1/customers/:id/meetings', () => {
  it('should list meetings for a customer', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/meetings`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { items: unknown[]; total: number }
    expect(body).toHaveProperty('items')
    expect(body.total).toBeGreaterThan(0)
  })

  it('should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/meetings?status=scheduled`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { items: unknown[]; total: number }
    expect(body.items.length).toBeGreaterThan(0)
  })
})

describe('GET /api/v1/customers/:id/meetings/:meetingId', () => {
  it('should get a meeting by ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { meeting: { id: string } }
    expect(body.meeting).toBeDefined()
  })

  it('should return 404 for unknown meeting', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/meetings/non-existent`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/v1/customers/:id/meetings/:meetingId', () => {
  it('should update a meeting', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Kickoff Updated' })

    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/v1/customers/:id/meetings/:meetingId/summary', () => {
  it('should update meeting summary', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/meetings/${meetingId}/summary`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ summary: 'Great meeting, client agreed on next steps.' })

    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/v1/customers/:id/meetings/:meetingId', () => {
  it('should cancel a meeting', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)
  })

  it('should return 400 when cancelling an already cancelled meeting', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/v1/meeting-types/:id', () => {
  it('should delete a meeting type', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/meeting-types/${meetingTypeId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)
  })
})
