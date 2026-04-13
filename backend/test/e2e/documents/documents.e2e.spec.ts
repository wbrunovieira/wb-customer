import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { setupE2E, teardownE2E } from '../../setup-e2e'
import { AppModule } from '@/app.module'

let app: INestApplication
let adminToken: string
let customerId: string

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
    .send({ email: 'admin@doc.com', password: 'Admin123@', name: 'Admin', role: 'admin' })

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'admin@doc.com', password: 'Admin123@' })
  adminToken = (login.body as { accessToken: string }).accessToken

  const customerRes = await request(app.getHttpServer())
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Acme Corp', email: 'acme@doc.com' })
  customerId = (customerRes.body as { customerId: string }).customerId
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

// ─────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────

describe('POST /api/v1/customers/:id/documents', () => {
  it('should upload a document successfully', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('%PDF fake content'), { filename: 'proposal.pdf', contentType: 'application/pdf' })
      .field('type', 'proposal')
      .field('title', 'Q1 Proposal')

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('documentId')
  })

  it('should return 400 when no file is provided', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'proposal', title: 'No file' })

    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid document type', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('content'), { filename: 'file.pdf', contentType: 'application/pdf' })
      .field('type', 'invoice')
      .field('title', 'Invalid Type')

    expect(res.status).toBe(400)
  })

  it('should return 404 for unknown customer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers/unknown-id/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('content'), { filename: 'file.pdf', contentType: 'application/pdf' })
      .field('type', 'proposal')
      .field('title', 'Title')

    expect(res.status).toBe(404)
  })

  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/documents`)
      .attach('file', Buffer.from('content'), { filename: 'file.pdf', contentType: 'application/pdf' })
      .field('type', 'proposal')
      .field('title', 'Title')

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────
// LIST
// ─────────────────────────────────────────

describe('GET /api/v1/customers/:id/documents', () => {
  it('should list documents with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(res.body).toHaveProperty('total')
    expect(Array.isArray(res.body.items)).toBe(true)
  })

  it('should filter by type', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/documents?type=proposal`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    for (const item of res.body.items as Array<{ type: string }>) {
      expect(item.type).toBe('proposal')
    }
  })

  it('should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/documents?status=pending_signature`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    for (const item of res.body.items as Array<{ status: string }>) {
      expect(item.status).toBe('pending_signature')
    }
  })

  it('should return 404 for unknown customer', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers/unknown-id/documents')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────
// GET ONE
// ─────────────────────────────────────────

describe('GET /api/v1/customers/:id/documents/:docId', () => {
  it('should return document details', async () => {
    const uploadRes = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('pdf'), { filename: 'contract.pdf', contentType: 'application/pdf' })
      .field('type', 'contract')
      .field('title', 'Service Contract')
    const documentId = (uploadRes.body as { documentId: string }).documentId

    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(documentId)
    expect(res.body.type).toBe('contract')
    expect(res.body.title).toBe('Service Contract')
    expect(res.body.status).toBe('pending_signature')
  })

  it('should return 404 for unknown document', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/documents/unknown-doc-id`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────
// UPDATE STATUS
// ─────────────────────────────────────────

describe('PATCH /api/v1/customers/:id/documents/:docId/status', () => {
  it('should update document status to signed', async () => {
    const uploadRes = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('pdf'), { filename: 'sign.pdf', contentType: 'application/pdf' })
      .field('type', 'contract')
      .field('title', 'Sign Me')
    const documentId = (uploadRes.body as { documentId: string }).documentId

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/documents/${documentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'signed' })

    expect(res.status).toBe(204)

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(detail.body.status).toBe('signed')
    expect(detail.body.signedAt).toBeTruthy()
  })

  it('should return 400 for invalid status', async () => {
    const uploadRes = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('pdf'), { filename: 'x.pdf', contentType: 'application/pdf' })
      .field('type', 'proposal')
      .field('title', 'X')
    const documentId = (uploadRes.body as { documentId: string }).documentId

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/documents/${documentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' })

    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────

describe('DELETE /api/v1/customers/:id/documents/:docId', () => {
  it('should delete a document (admin)', async () => {
    const uploadRes = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('pdf'), { filename: 'del.pdf', contentType: 'application/pdf' })
      .field('type', 'addendum')
      .field('title', 'Delete Me')
    const documentId = (uploadRes.body as { documentId: string }).documentId

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(detail.status).toBe(404)
  })

  it('should return 404 for already-deleted document', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/documents/non-existent`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})
