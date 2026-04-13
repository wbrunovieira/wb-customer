import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { setupE2E, teardownE2E } from '../../setup-e2e'
import { AppModule } from '@/app.module'

let app: INestApplication
let adminToken: string
let employeeToken: string
let employeeId: string

beforeAll(async () => {
  await setupE2E()

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  await app.init()

  // Create admin user
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email: 'admin@example.com',
      password: 'Admin123@',
      name: 'Admin User',
      role: 'admin',
    })

  const adminLogin = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'admin@example.com', password: 'Admin123@' })

  adminToken = (adminLogin.body as { accessToken: string }).accessToken

  // Create employee user
  const empReg = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email: 'employee@example.com',
      password: 'Employee123@',
      name: 'Employee User',
      role: 'employee',
    })

  employeeId = (empReg.body as { userId: string }).userId

  const empLogin = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'employee@example.com', password: 'Employee123@' })

  employeeToken = (empLogin.body as { accessToken: string }).accessToken
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

describe('GET /api/v1/users', () => {
  it('should return users list for admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('users')
    expect(res.body).toHaveProperty('total')
    expect(res.body.total).toBeGreaterThanOrEqual(2)
  })

  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/users')
    expect(res.status).toBe(401)
  })

  it('should return 403 for employee role', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${employeeToken}`)

    expect(res.status).toBe(403)
  })

  it('should paginate results', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&limit=1')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(1)
    expect(res.body).toHaveProperty('pages')
  })
})

describe('PATCH /api/v1/users/:id/profile', () => {
  it('should update user profile and return 204', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${employeeId}/profile`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Name' })

    expect(res.status).toBe(204)
  })

  it('should return 404 for non-existent user', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/users/non-existent-id/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' })

    expect(res.status).toBe(404)
  })

  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${employeeId}/profile`)
      .send({ name: 'No Auth' })

    expect(res.status).toBe(401)
  })

  it('should allow employee to update their own profile', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${employeeId}/profile`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'Self Updated' })

    expect(res.status).toBe(204)
  })
})
