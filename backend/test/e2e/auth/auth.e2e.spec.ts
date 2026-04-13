import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { setupE2E, teardownE2E } from '../../setup-e2e'
import { AppModule } from '@/app.module'

let app: INestApplication

beforeAll(async () => {
  await setupE2E()

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api/v1')
  await app.init()
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

describe('POST /api/v1/auth/register', () => {
  it('should create a new user and return userId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'Password123@',
        name: 'New User',
        role: 'employee',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('userId')
    expect(typeof res.body.userId).toBe('string')
  })

  it('should return 409 when email already exists', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'Password123@',
        name: 'First',
        role: 'employee',
      })

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'Password123@',
        name: 'Second',
        role: 'employee',
      })

    expect(res.status).toBe(409)
  })

  it('should return 400 for invalid email', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'not-an-email',
        password: 'Password123@',
        name: 'User',
        role: 'employee',
      })

    expect(res.status).toBe(400)
  })

  it('should return 400 for weak password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'weakpass@example.com',
        password: 'weak',
        name: 'User',
        role: 'employee',
      })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/v1/auth/login', () => {
  it('should return tokens for valid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'login@example.com',
        password: 'Password123@',
        name: 'Login User',
        role: 'employee',
      })

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'Password123@' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body).toHaveProperty('refreshToken')
    expect(res.body).toHaveProperty('userId')
    expect(res.body).toHaveProperty('role')
  })

  it('should return 401 for wrong password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'WrongPass123@' })

    expect(res.status).toBe(401)
  })

  it('should return 401 for non-existent user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com', password: 'Password123@' })

    expect(res.status).toBe(401)
  })
})

describe('POST /api/v1/auth/refresh', () => {
  it('should return a new access token for a valid refresh token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'refresh@example.com',
        password: 'Password123@',
        name: 'Refresh User',
        role: 'employee',
      })

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'refresh@example.com', password: 'Password123@' })

    const { refreshToken } = loginRes.body as { refreshToken: string }

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
  })

  it('should return 401 for invalid refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid-token' })

    expect(res.status).toBe(401)
  })
})

describe('POST /api/v1/auth/logout', () => {
  it('should revoke the refresh token and return 204', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'logout@example.com',
        password: 'Password123@',
        name: 'Logout User',
        role: 'employee',
      })

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'logout@example.com', password: 'Password123@' })

    const { refreshToken } = loginRes.body as { refreshToken: string }

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken })

    expect(res.status).toBe(204)
  })

  it('should return 401 for non-existent refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'ghost-token' })

    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/auth/me', () => {
  it('should return current user data for a valid token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'me@example.com',
        password: 'Password123@',
        name: 'Me User',
        role: 'employee',
      })

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'me@example.com', password: 'Password123@' })

    const { accessToken } = loginRes.body as { accessToken: string }

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('me@example.com')
    expect(res.body.name).toBe('Me User')
    expect(res.body.role).toBe('employee')
  })

  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me')
    expect(res.status).toBe(401)
  })
})
