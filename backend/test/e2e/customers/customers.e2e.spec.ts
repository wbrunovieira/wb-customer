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

  // Create admin
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: 'admin@example.com', password: 'Admin123@', name: 'Admin', role: 'admin' })

  const adminLogin = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'admin@example.com', password: 'Admin123@' })
  adminToken = (adminLogin.body as { accessToken: string }).accessToken

  // Create employee
  const empReg = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: 'emp@example.com', password: 'Emp123@!', name: 'Employee', role: 'employee' })
  employeeId = (empReg.body as { userId: string }).userId

  const empLogin = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'emp@example.com', password: 'Emp123@!' })
  employeeToken = (empLogin.body as { accessToken: string }).accessToken
})

afterAll(async () => {
  await app.close()
  await teardownE2E()
})

// ─────────────────────────────────────────
// CUSTOMER CATEGORIES
// ─────────────────────────────────────────

describe('POST /api/v1/customer-categories', () => {
  it('should create a category (admin)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customer-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'SaaS', description: 'Software companies' })

    expect(res.status).toBe(201)
    expect(res.body.categoryId).toBeDefined()
  })

  it('should return 409 for duplicate category name', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/customer-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Agency' })

    const res = await request(app.getHttpServer())
      .post('/api/v1/customer-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Agency' })

    expect(res.status).toBe(409)
  })

  it('should return 403 for employee', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customer-categories')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'Other' })

    expect(res.status).toBe(403)
  })
})

describe('GET /api/v1/customer-categories', () => {
  it('should list categories', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customer-categories')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.categories).toBeInstanceOf(Array)
    expect(res.body.categories.length).toBeGreaterThanOrEqual(2)
  })

  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/customer-categories')
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────
// CUSTOMERS CRUD
// ─────────────────────────────────────────

describe('POST /api/v1/customers', () => {
  it('should create a customer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Acme Corp', email: 'acme@example.com', phone: '+5511999999999' })

    expect(res.status).toBe(201)
    expect(res.body.customerId).toBeDefined()
  })

  it('should return 409 for duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Duplicate', email: 'dup@example.com' })

    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Duplicate 2', email: 'dup@example.com' })

    expect(res.status).toBe(409)
  })

  it('should create customer with category', async () => {
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/customer-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Category' })
    const categoryId = (catRes.body as { categoryId: string }).categoryId

    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Categorized Corp', email: 'cat@example.com', categoryId })

    expect(res.status).toBe(201)
  })

  it('should return 400 for invalid categoryId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad Cat', email: 'badcat@example.com', categoryId: 'non-existent-id' })

    expect(res.status).toBe(400)
  })

  it('should return 401 without token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .send({ name: 'X', email: 'x@x.com' })

    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/customers', () => {
  it('should list customers with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.items).toBeInstanceOf(Array)
    expect(typeof res.body.total).toBe('number')
  })

  it('should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers?status=active')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    if ((res.body.items as { status: string }[]).length > 0) {
      expect(res.body.items[0].status).toBe('active')
    }
  })

  it('should filter by search term', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers?search=Acme')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const items = res.body.items as { name: string }[]
    expect(items.length).toBeGreaterThanOrEqual(1)
    expect(items.every((c) => c.name.toLowerCase().includes('acme'))).toBe(true)
  })
})

describe('GET /api/v1/customers/:id', () => {
  it('should return a customer with contacts and employees', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Detail Corp', email: 'detail@example.com' })
    const customerId = (create.body as { customerId: string }).customerId

    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(customerId)
    expect(res.body.contacts).toBeInstanceOf(Array)
    expect(res.body.employees).toBeInstanceOf(Array)
  })

  it('should return 404 for unknown customer', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers/non-existent-id')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/v1/customers/:id', () => {
  it('should update a customer', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Patch Corp', email: 'patch@example.com' })
    const customerId = (create.body as { customerId: string }).customerId

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Patch Corp Updated', status: 'active' })

    expect(res.status).toBe(204)
  })

  it('should return 400 for invalid status', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Status Corp', email: 'status@example.com' })
    const customerId = (create.body as { customerId: string }).customerId

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' })

    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/v1/customers/:id', () => {
  it('should soft delete a customer (admin)', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Delete Corp', email: 'delete@example.com' })
    const customerId = (create.body as { customerId: string }).customerId

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)

    // Verify deleted customer is not findable
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(getRes.status).toBe(404)
  })

  it('should return 403 for employee', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'No Delete Corp', email: 'nodelete@example.com' })
    const customerId = (create.body as { customerId: string }).customerId

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}`)
      .set('Authorization', `Bearer ${employeeToken}`)

    expect(res.status).toBe(403)
  })
})

// ─────────────────────────────────────────
// EMPLOYEE ASSIGNMENT
// ─────────────────────────────────────────

describe('POST /api/v1/customers/:id/employees', () => {
  it('should assign an employee to a customer', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Assign Corp', email: 'assign@example.com' })
    const customerId = (create.body as { customerId: string }).customerId

    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/employees`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: employeeId })

    expect(res.status).toBe(204)
  })

  it('should return 403 for employee role', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Forbidden Assign', email: 'forbassign@example.com' })
    const customerId = (create.body as { customerId: string }).customerId

    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/employees`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ userId: employeeId })

    expect(res.status).toBe(403)
  })
})

// ─────────────────────────────────────────
// CONTACTS
// ─────────────────────────────────────────

describe('Contacts /api/v1/customers/:id/contacts', () => {
  let customerId: string

  beforeAll(async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Contact Corp', email: 'contactcorp@example.com' })
    customerId = (create.body as { customerId: string }).customerId
  })

  it('should add a contact', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'John Doe', email: 'john@contact.com', role: 'CEO', isPrimary: true })

    expect(res.status).toBe(201)
    expect(res.body.contactId).toBeDefined()
  })

  it('should list contacts', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/contacts`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.contacts).toBeInstanceOf(Array)
    expect(res.body.contacts.length).toBeGreaterThanOrEqual(1)
  })

  it('should update a contact', async () => {
    const addRes = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Jane Doe' })
    const contactId = (addRes.body as { contactId: string }).contactId

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/contacts/${contactId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Jane Updated', role: 'CFO' })

    expect(res.status).toBe(204)
  })

  it('should delete a contact', async () => {
    const addRes = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'To Delete' })
    const contactId = (addRes.body as { contactId: string }).contactId

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/contacts/${contactId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)
  })

  it('should return 404 for contact of wrong customer', async () => {
    const otherCreate = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Other Corp', email: 'other@example.com' })
    const otherCustomerId = (otherCreate.body as { customerId: string }).customerId

    const addRes = await request(app.getHttpServer())
      .post(`/api/v1/customers/${otherCustomerId}/contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Other Contact' })
    const contactId = (addRes.body as { contactId: string }).contactId

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/contacts/${contactId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Hacked' })

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────
// ACTIVITIES
// ─────────────────────────────────────────

describe('GET /api/v1/customers/:id/audit', () => {
  it('should return audit log for a customer', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Activity Corp', email: 'activity@example.com' })
    const customerId = (create.body as { customerId: string }).customerId

    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/audit`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.items).toBeInstanceOf(Array)
    expect(res.body.items.length).toBeGreaterThanOrEqual(1)
    expect(res.body.items[0].type).toBe('created')
  })

  it('should return 404 for unknown customer', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers/non-existent/audit')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})
