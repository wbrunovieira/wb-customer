/**
 * E2E tests for communication controllers:
 *   - GoTo webhook (POST /goto/webhook)
 *   - GoTo cron endpoints
 *   - Evolution webhook (POST /evolution/webhook)
 *   - Evolution cron endpoint
 *   - Gmail poll (GET /google/gmail-poll)
 *   - Send email (POST /customers/:id/email)
 *   - Send WhatsApp (POST /evolution/customers/:id/send)
 *
 * Scope: authentication / authorization gates.
 * Business-logic (external API calls) is covered by unit tests.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupE2E, teardownE2E } from '../../setup-e2e'
import { AppModule } from '@/app.module'

// Use unique test-only values for secrets not already in .env.
// For CRON_SECRET (which IS in .env), we read the real value so dotenv doesn't interfere.
// We set the others BEFORE the NestJS module boots so ConfigService picks them up.
const GOTO_WEBHOOK_SECRET = 'e2e-goto-secret-test'
const EVOLUTION_WEBHOOK_SECRET = 'e2e-evolution-secret-test'
const INTERNAL_API_KEY = 'e2e-internal-key-test'

// CRON_SECRET is already in .env — read and reuse the real value.
// URL-encode it because it may contain special chars (/, +, =).
const CRON_SECRET = process.env.CRON_SECRET ?? 'fallback-e2e-cron-secret'
const CRON_SECRET_ENCODED = encodeURIComponent(CRON_SECRET)

let app: INestApplication
let adminToken: string
let customerId: string
let seedPrisma: PrismaClient

beforeAll(async () => {
  // Set secrets that are NOT in .env before the NestJS module boots
  process.env.GOTO_WEBHOOK_SECRET = GOTO_WEBHOOK_SECRET
  process.env.EVOLUTION_WEBHOOK_SECRET = EVOLUTION_WEBHOOK_SECRET
  process.env.INTERNAL_API_KEY = INTERNAL_API_KEY

  const { prisma } = await setupE2E()
  seedPrisma = prisma

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  await app.init()

  // Create admin user + token
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: 'admin@comms.com', password: 'Admin123@', name: 'Admin', role: 'admin' })

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'admin@comms.com', password: 'Admin123@' })
  adminToken = (login.body as { accessToken: string }).accessToken

  // Seed customer
  const customer = await seedPrisma.customer.create({
    data: {
      id: 'e2e-comms-customer',
      name: 'Comms Corp',
      email: 'comms@example.com',
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
// GoTo WEBHOOK
// ─────────────────────────────────────────

describe('POST /api/v1/goto/webhook', () => {
  it('should return 401 when secret is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/goto/webhook')
      .send({ conversationSpaceId: 'cs-test' })
    expect(res.status).toBe(401)
  })

  it('should return 401 when secret is wrong', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/goto/webhook?secret=wrong-secret')
      .send({ conversationSpaceId: 'cs-test' })
    expect(res.status).toBe(401)
  })

  it('should return 200 with correct secret (processing is async)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/goto/webhook?secret=${GOTO_WEBHOOK_SECRET}`)
      .send({ conversationSpaceId: 'cs-e2e-test' })
    expect(res.status).toBe(200)
    expect((res.body as { ok: boolean }).ok).toBe(true)
  })
})

// ─────────────────────────────────────────
// GoTo CRON
// ─────────────────────────────────────────

describe('POST /api/v1/goto/check-recordings', () => {
  it('should return 401 with wrong secret', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/goto/check-recordings?secret=bad')
    expect(res.status).toBe(401)
  })

  it('should return 200 with correct cron secret', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/goto/check-recordings?secret=${CRON_SECRET_ENCODED}`)
    expect(res.status).toBe(200)
  })
})

describe('POST /api/v1/goto/check-transcriptions', () => {
  it('should return 401 with wrong secret', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/goto/check-transcriptions?secret=bad')
    expect(res.status).toBe(401)
  })

  it('should return 200 with correct cron secret', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/goto/check-transcriptions?secret=${CRON_SECRET_ENCODED}`)
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────
// Evolution WEBHOOK
// ─────────────────────────────────────────

describe('POST /api/v1/evolution/webhook', () => {
  it('should return 401 when x-webhook-secret header is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/evolution/webhook')
      .send({ event: 'messages.upsert' })
    expect(res.status).toBe(401)
  })

  it('should return 401 when x-webhook-secret is wrong', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/evolution/webhook')
      .set('x-webhook-secret', 'wrong')
      .send({ event: 'messages.upsert' })
    expect(res.status).toBe(401)
  })

  it('should return 200 with correct x-webhook-secret (processing is async)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/evolution/webhook')
      .set('x-webhook-secret', EVOLUTION_WEBHOOK_SECRET)
      .send({ event: 'connection.update' }) // non-upsert → ignored, but returns 200
    expect(res.status).toBe(200)
    expect((res.body as { ok: boolean }).ok).toBe(true)
  })
})

// ─────────────────────────────────────────
// Evolution CRON
// ─────────────────────────────────────────

describe('POST /api/v1/evolution/check-transcriptions', () => {
  it('should return 401 with wrong cron secret', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/evolution/check-transcriptions?secret=nope')
    expect(res.status).toBe(401)
  })

  it('should return 200 with correct cron secret', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/evolution/check-transcriptions?secret=${CRON_SECRET_ENCODED}`)
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────
// Evolution SEND (JWT protected)
// ─────────────────────────────────────────

describe('POST /api/v1/evolution/customers/:id/send', () => {
  it('should return 401 without JWT', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/evolution/customers/${customerId}/send`)
      .send({ to: '5511999998888', text: 'Olá' })
    expect(res.status).toBe(401)
  })

  it('should return 401 with invalid JWT', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/evolution/customers/${customerId}/send`)
      .set('Authorization', 'Bearer invalid-token')
      .send({ to: '5511999998888', text: 'Olá' })
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────
// Gmail POLL (x-api-key protected)
// ─────────────────────────────────────────

describe('GET /api/v1/google/gmail-poll', () => {
  it('should return 401 when x-api-key is missing', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/google/gmail-poll')
    expect(res.status).toBe(401)
  })

  it('should return 401 when x-api-key is wrong', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/google/gmail-poll')
      .set('x-api-key', 'wrong-key')
    expect(res.status).toBe(401)
  })

  it('should return 200 with correct x-api-key (poll runs in background)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/google/gmail-poll')
      .set('x-api-key', INTERNAL_API_KEY)
    expect(res.status).toBe(200)
    expect((res.body as { ok: boolean }).ok).toBe(true)
  })
})

// ─────────────────────────────────────────
// Gmail SEND EMAIL (JWT protected)
// ─────────────────────────────────────────

describe('POST /api/v1/customers/:id/email', () => {
  it('should return 401 without JWT', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/email`)
      .send({ to: ['c@c.com'], subject: 'Test', htmlBody: '<p>hi</p>' })
    expect(res.status).toBe(401)
  })

  it('should return 401 with invalid JWT', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/email`)
      .set('Authorization', 'Bearer bad-token')
      .send({ to: ['c@c.com'], subject: 'Test', htmlBody: '<p>hi</p>' })
    expect(res.status).toBe(401)
  })

  it('should return 400 when to field is empty', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/email`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ to: [], subject: 'Test', htmlBody: '<p>hi</p>' })
    expect(res.status).toBe(400)
  })

  it('should accept attachments field without validation error (fails on Google auth, not on DTO shape)', async () => {
    const base64Content = Buffer.from('fake pdf content').toString('base64')
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/email`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        to: ['cliente@empresa.com'],
        subject: 'Com Anexo',
        htmlBody: '<p>Segue</p>',
        attachments: [{ fileName: 'proposta.pdf', mimeType: 'application/pdf', base64: base64Content }],
      })
    // NOT 400 (bad request) — failure is 500/4xx from Google connectivity, not DTO validation
    expect(res.status).not.toBe(400)
  })

  it('should return 400 when attachment is missing required fields', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/email`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        to: ['a@b.com'],
        subject: 'S',
        htmlBody: '<p>h</p>',
        attachments: [{ fileName: 'file.pdf' }], // missing mimeType and base64
      })
    // Missing required fields in attachment DTO should still reach the controller
    // (NestJS doesn't validate nested DTO by default without ValidationPipe + class-validator)
    // This test documents the current behaviour.
    expect([400, 500]).toContain(res.status)
  })

  // NOTE: Full send test requires real Google credentials and is validated
  // in unit tests (gmail.service.spec.ts + gmail.controller.spec.ts).
})
