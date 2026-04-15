/**
 * E2E tests for Creatives and Creative Strategies:
 *   - POST   /customers/:id/creatives
 *   - GET    /customers/:id/creatives
 *   - GET    /customers/:id/creatives/:creativeId
 *   - PATCH  /customers/:id/creatives/:creativeId
 *   - DELETE /customers/:id/creatives/:creativeId  (admin only)
 *   - POST   /customers/:id/creatives/:creativeId/performances
 *   - GET    /customers/:id/creatives/:creativeId/performances
 *   - POST   /customers/:id/creative-strategies
 *   - GET    /customers/:id/creative-strategies
 *   - PATCH  /customers/:id/creative-strategies/:strategyId
 *   - DELETE /customers/:id/creative-strategies/:strategyId  (admin only)
 *
 * Scope: authentication / authorization gates + happy-path CRUD.
 * Drive upload is covered by unit tests (GoogleCreativesFolderService).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupE2E, teardownE2E } from '../../setup-e2e'
import { AppModule } from '@/app.module'

let app: INestApplication
let adminToken: string
let employeeToken: string
let customerId: string
let creativeId: string
let strategyId: string
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

  // Admin user
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: 'admin@creatives.com', password: 'Admin123@', name: 'Admin', role: 'admin' })

  const adminLogin = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'admin@creatives.com', password: 'Admin123@' })
  adminToken = (adminLogin.body as { accessToken: string }).accessToken

  // Employee user
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: 'emp@creatives.com', password: 'Employee123@', name: 'Employee', role: 'employee' })

  const empLogin = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'emp@creatives.com', password: 'Employee123@' })
  employeeToken = (empLogin.body as { accessToken: string }).accessToken

  // Seed customer directly — bypass Google Drive
  const customer = await seedPrisma.customer.create({
    data: {
      id: 'e2e-creatives-customer',
      name: 'Creatives Corp',
      email: 'creatives@example.com',
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
// CREATIVES — AUTH GATES
// ─────────────────────────────────────────

describe('POST /api/v1/customers/:id/creatives — auth', () => {
  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creatives`)
      .send({ title: 'Ad', type: 'image' })
    expect(res.status).toBe(401)
  })

  it('should return 401 with invalid token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creatives`)
      .set('Authorization', 'Bearer bad-token')
      .send({ title: 'Ad', type: 'image' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/customers/:id/creatives — auth', () => {
  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creatives`)
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────
// CREATIVES — HAPPY PATH
// ─────────────────────────────────────────

describe('POST /api/v1/customers/:id/creatives — create', () => {
  it('admin should create an image creative', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creatives`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Anúncio Lançamento', type: 'image', objective: 'sales' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('creativeId')
    creativeId = (res.body as { creativeId: string }).creativeId
  })

  it('employee should create a video creative', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creatives`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'Vídeo Produto', type: 'video', caption: 'Conheça nosso produto' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('creativeId')
  })

  it('should return 400 for invalid type', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creatives`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Bad', type: 'gif' })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/v1/customers/:id/creatives — list', () => {
  it('should return paginated list', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creatives`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(res.body).toHaveProperty('total')
    expect((res.body as { items: unknown[] }).items.length).toBeGreaterThan(0)
  })

  it('should filter by type', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creatives?type=image`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const items = (res.body as { items: { type: string }[] }).items
    expect(items.every(c => c.type === 'image')).toBe(true)
  })

  it('should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creatives?status=draft`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const items = (res.body as { items: { status: string }[] }).items
    expect(items.every(c => c.status === 'draft')).toBe(true)
  })
})

describe('GET /api/v1/customers/:id/creatives/:creativeId — get', () => {
  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creatives/${creativeId}`)
    expect(res.status).toBe(401)
  })

  it('should return creative detail', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creatives/${creativeId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect((res.body as { id: string }).id).toBe(creativeId)
    expect((res.body as { title: string }).title).toBe('Anúncio Lançamento')
  })

  it('should return 404 for non-existent creative', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creatives/non-existent-id`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/v1/customers/:id/creatives/:creativeId — update', () => {
  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/creatives/${creativeId}`)
      .send({ status: 'active' })
    expect(res.status).toBe(401)
  })

  it('admin should update creative status', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/creatives/${creativeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' })

    expect(res.status).toBe(204)
  })

  it('should reflect status change on GET', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creatives/${creativeId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect((res.body as { status: string }).status).toBe('active')
  })

  it('employee should update title', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/creatives/${creativeId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'Anúncio Atualizado' })

    expect(res.status).toBe(204)
  })
})

// ─────────────────────────────────────────
// PERFORMANCE
// ─────────────────────────────────────────

describe('POST /api/v1/customers/:id/creatives/:creativeId/performances', () => {
  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creatives/${creativeId}/performances`)
      .send({ platform: 'facebook', impressions: 1000, clicks: 50, conversions: 5, spend: 100, startDate: '2026-04-01' })
    expect(res.status).toBe(401)
  })

  it('admin should record performance metrics', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creatives/${creativeId}/performances`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        platform: 'facebook',
        impressions: 10000,
        clicks: 320,
        conversions: 15,
        spend: 250.00,
        ctr: 3.2,
        cpc: 0.78,
        roas: 4.5,
        startDate: '2026-04-01',
        endDate: '2026-04-05',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('performanceId')
  })

  it('should list performance records', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creatives/${creativeId}/performances`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect((res.body as { items: unknown[] }).items.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────
// DELETE CREATIVE (admin only)
// ─────────────────────────────────────────

describe('DELETE /api/v1/customers/:id/creatives/:creativeId — admin only', () => {
  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/creatives/${creativeId}`)
    expect(res.status).toBe(401)
  })

  it('employee should be forbidden (403)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/creatives/${creativeId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
    expect(res.status).toBe(403)
  })

  it('admin should soft-delete the creative', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/creatives/${creativeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(204)
  })

  it('deleted creative should no longer appear in GET', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creatives/${creativeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────
// CREATIVE STRATEGIES — AUTH GATES
// ─────────────────────────────────────────

describe('POST /api/v1/customers/:id/creative-strategies — auth', () => {
  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creative-strategies`)
      .send({ name: 'S1', phase: 'exploration', creativeIds: [] })
    expect(res.status).toBe(401)
  })

  it('should return 401 with invalid token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creative-strategies`)
      .set('Authorization', 'Bearer bad')
      .send({ name: 'S1', phase: 'exploration', creativeIds: [] })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/customers/:id/creative-strategies — auth', () => {
  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creative-strategies`)
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────
// CREATIVE STRATEGIES — HAPPY PATH
// ─────────────────────────────────────────

describe('POST /api/v1/customers/:id/creative-strategies — create', () => {
  it('admin should create a phase A strategy', async () => {
    // First create two creatives to attach
    const c1 = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creatives`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Creative A1', type: 'image' })
    const c2 = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creatives`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Creative A2', type: 'video' })

    const creativeIds = [
      (c1.body as { creativeId: string }).creativeId,
      (c2.body as { creativeId: string }).creativeId,
    ]

    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creative-strategies`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Exploração Abril',
        phase: 'exploration',
        objective: 'sales',
        budget: 500,
        durationDays: 5,
        creativeIds,
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('strategyId')
    strategyId = (res.body as { strategyId: string }).strategyId
  })

  it('employee should create a strategy', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/creative-strategies`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'Exploração Employee', phase: 'exploration', creativeIds: [] })

    expect(res.status).toBe(201)
  })
})

describe('GET /api/v1/customers/:id/creative-strategies — list', () => {
  it('should return paginated strategies', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creative-strategies`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(res.body).toHaveProperty('total')
    expect((res.body as { items: unknown[] }).items.length).toBeGreaterThan(0)
  })

  it('should filter by phase', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creative-strategies?phase=exploration`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const items = (res.body as { items: { phase: string }[] }).items
    expect(items.every(s => s.phase === 'exploration')).toBe(true)
  })

  it('should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/creative-strategies?status=active`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const items = (res.body as { items: { status: string }[] }).items
    expect(items.every(s => s.status === 'active')).toBe(true)
  })
})

describe('PATCH /api/v1/customers/:id/creative-strategies/:strategyId — update', () => {
  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/creative-strategies/${strategyId}`)
      .send({ status: 'paused' })
    expect(res.status).toBe(401)
  })

  it('admin should pause a strategy', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/creative-strategies/${strategyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'paused' })

    expect(res.status).toBe(204)
  })

  it('admin should complete a strategy', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/creative-strategies/${strategyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed' })

    expect(res.status).toBe(204)
  })

  it('should return 404 for non-existent strategy', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/creative-strategies/ghost-id`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'paused' })

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────
// DELETE STRATEGY (admin only)
// ─────────────────────────────────────────

describe('DELETE /api/v1/customers/:id/creative-strategies/:strategyId — admin only', () => {
  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/creative-strategies/${strategyId}`)
    expect(res.status).toBe(401)
  })

  it('employee should be forbidden (403)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/creative-strategies/${strategyId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
    expect(res.status).toBe(403)
  })

  it('admin should delete the strategy', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/creative-strategies/${strategyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(204)
  })
})
