import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { setupE2E, teardownE2E } from '../../setup-e2e'
import { AppModule } from '@/app.module'

let app: INestApplication
let adminToken: string
let customerId: string
let masterToken: string
let masterUserId: string
let memberToken: string
let customerUserId: string
let meetingId: string

beforeAll(async () => {
  await setupE2E()

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  await app.init()

  // Create admin
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: 'admin@portal.com', password: 'Admin123@', name: 'Admin', role: 'admin' })

  const adminLogin = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'admin@portal.com', password: 'Admin123@' })
  adminToken = (adminLogin.body as { accessToken: string }).accessToken

  // Create customer company
  const customerRes = await request(app.getHttpServer())
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Portal Corp', email: 'portal@corp.com' })
  customerId = (customerRes.body as { customerId: string }).customerId

  // Schedule a meeting for this customer
  const meetingRes = await request(app.getHttpServer())
    .post(`/api/v1/customers/${customerId}/meetings`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Kickoff',
      startAt: '2026-07-01T10:00:00Z',
      endAt: '2026-07-01T11:00:00Z',
      attendeeEmails: ['client@portal.com'],
    })
  meetingId = (meetingRes.body as { meetingId: string }).meetingId
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

// ─────────────────────────────────────────
// ADMIN — MANAGE PORTAL USERS
// ─────────────────────────────────────────

describe('POST /api/v1/customers/:id/portal-users (admin creates master)', () => {
  it('should create a portal master user', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/portal-users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'master@portal.com',
        password: 'Master@123',
        name: 'Master User',
        customerRole: 'master',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('userId')
    expect(res.body).toHaveProperty('customerUserId')
    customerUserId = (res.body as { userId: string; customerUserId: string }).customerUserId
    masterUserId = (res.body as { userId: string }).userId
  })

  it('should return 409 for duplicate email', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/portal-users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'master@portal.com',
        password: 'Master@123',
        name: 'Duplicate',
      })
    expect(res.status).toBe(409)
  })

  it('should return 404 for unknown customer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers/unknown/portal-users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'x@x.com', password: 'Temp@1234', name: 'X' })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/v1/customers/:id/portal-users (admin lists)', () => {
  it('should list portal users', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/portal-users`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { users: unknown[] }
    expect(body.users.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────
// MASTER — LOGIN AND PORTAL ACCESS
// ─────────────────────────────────────────

describe('Master user — login and portal', () => {
  it('master should login and receive customerId in token payload', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'master@portal.com', password: 'Master@123' })

    expect(login.status).toBe(200)
    const body = login.body as { accessToken: string; customerId: string; customerRole: string }
    expect(body.customerId).toBe(customerId)
    expect(body.customerRole).toBe('master')
    masterToken = body.accessToken
  })

  it('master should list portal meetings', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/meetings')
      .set('Authorization', `Bearer ${masterToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { items: unknown[]; total: number }
    expect(body).toHaveProperty('items')
  })

  it('master should get a specific meeting', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/portal/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${masterToken}`)

    expect(res.status).toBe(200)
  })

  it('master should get 404 for a meeting from another customer', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/meetings/non-existent')
      .set('Authorization', `Bearer ${masterToken}`)

    expect(res.status).toBe(404)
  })

  it('master should list portal users', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/users')
      .set('Authorization', `Bearer ${masterToken}`)

    expect(res.status).toBe(200)
  })

  it('master should create a member sub-user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/portal/users')
      .set('Authorization', `Bearer ${masterToken}`)
      .send({
        email: 'member@portal.com',
        password: 'Member@123',
        name: 'Member User',
      })

    expect(res.status).toBe(201)
  })
})

// ─────────────────────────────────────────
// MEMBER — LOGIN AND RESTRICTED ACCESS
// ─────────────────────────────────────────

describe('Member user — restricted portal access', () => {
  it('member should login successfully', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'member@portal.com', password: 'Member@123' })

    expect(login.status).toBe(200)
    const body = login.body as { accessToken: string; customerRole: string }
    expect(body.customerRole).toBe('member')
    memberToken = body.accessToken
  })

  it('member should list portal meetings', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/meetings')
      .set('Authorization', `Bearer ${memberToken}`)

    expect(res.status).toBe(200)
  })

  it('member should be forbidden from listing portal users', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/users')
      .set('Authorization', `Bearer ${memberToken}`)

    expect(res.status).toBe(403)
  })

  it('member should be forbidden from creating sub-users', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/portal/users')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ email: 'hack@portal.com', password: 'Temp@1234', name: 'Hack' })

    expect(res.status).toBe(403)
  })
})

// ─────────────────────────────────────────
// ACCESS CONTROL — customer cannot hit admin routes
// ─────────────────────────────────────────

describe('Customer role — cannot access admin/employee routes', () => {
  it('portal user should be forbidden from listing all customers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${masterToken}`)

    expect(res.status).toBe(403)
  })

  it('portal user should be forbidden from creating customers', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ name: 'Evil Corp', email: 'evil@corp.com' })

    expect(res.status).toBe(403)
  })
})

// ─────────────────────────────────────────
// ADMIN — REVOKE ACCESS
// ─────────────────────────────────────────

describe('DELETE /api/v1/customers/:id/portal-users/:cuId (admin revokes)', () => {
  it('should revoke portal access', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/portal-users/${customerUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)
  })
})
