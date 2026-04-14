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
    .send({ email: 'admin@tasks.com', password: 'Admin123@', name: 'Admin', role: 'admin' })

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'admin@tasks.com', password: 'Admin123@' })
  adminToken = (login.body as { accessToken: string }).accessToken

  // Seed customer directly to avoid Google Drive dependency
  const customer = await seedPrisma.customer.create({
    data: {
      id: 'e2e-customer-tasks',
      name: 'Tasks Corp',
      email: 'tasks@example.com',
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
// SPRINTS
// ─────────────────────────────────────────

describe('POST /api/v1/customers/:customerId/sprints', () => {
  it('should create a sprint', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/sprints`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sprint 1', startAt: '2026-04-01T00:00:00Z', endAt: '2026-04-14T00:00:00Z' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('sprintId')
  })
})

describe('GET /api/v1/customers/:customerId/sprints', () => {
  it('should list sprints', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/sprints`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('sprints')
    const body = res.body as { sprints: unknown[] }
    expect(body.sprints.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────

let taskId: string

describe('POST /api/v1/customers/:customerId/tasks', () => {
  it('should create a task with default backlog status', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Fix login bug', description: 'Auth failing on mobile' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('taskId')
    taskId = (res.body as { taskId: string }).taskId
  })

  it('should create an idea task', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'New feature idea', status: 'idea_could' })

    expect(res.status).toBe(201)
  })
})

describe('GET /api/v1/customers/:customerId/tasks', () => {
  it('should list tasks for a customer', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/tasks`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { items: unknown[]; total: number }
    expect(body.items.length).toBeGreaterThan(0)
    expect(body).toHaveProperty('total')
  })

  it('should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/tasks?status=backlog`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { items: Array<{ status: string }> }
    expect(body.items.every((t) => t.status === 'backlog')).toBe(true)
  })

  it('should filter ideas only', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/tasks?ideas=true`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { items: Array<{ status: string }> }
    expect(body.items.every((t) => t.status === 'idea_could' || t.status === 'idea_should')).toBe(true)
  })
})

describe('GET /api/v1/customers/:customerId/tasks/:taskId', () => {
  it('should return task detail', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { task: { id: string; title: string } }
    expect(body.task.id).toBe(taskId)
    expect(body.task.title).toBe('Fix login bug')
  })

  it('should return 404 for unknown task', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/tasks/non-existent`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/v1/customers/:customerId/tasks/:taskId', () => {
  it('should update task fields', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Updated title', impact: 8, confidence: 7, effort: 4 })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('taskId', taskId)
  })
})

describe('PATCH /api/v1/customers/:customerId/tasks/:taskId/status', () => {
  it('should move task to in_progress', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'in_progress' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('taskId', taskId)
  })

  it('should return 400 for invalid status', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'invalid_status' })

    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────
// CHECKLIST
// ─────────────────────────────────────────

let checklistItemId: string

describe('POST /api/v1/customers/:customerId/tasks/:taskId/checklist', () => {
  it('should add a checklist item', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/tasks/${taskId}/checklist`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'Write tests', position: 0 })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('itemId')
    checklistItemId = (res.body as { itemId: string }).itemId
  })
})

describe('PATCH /api/v1/customers/:customerId/tasks/:taskId/checklist/:itemId/toggle', () => {
  it('should toggle a checklist item', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customerId}/tasks/${taskId}/checklist/${checklistItemId}/toggle`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { isDone: boolean; progress: number }
    expect(body.isDone).toBe(true)
    expect(body.progress).toBe(100)
  })
})

describe('DELETE /api/v1/customers/:customerId/tasks/:taskId/checklist/:itemId', () => {
  it('should delete a checklist item', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/tasks/${taskId}/checklist/${checklistItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)
  })
})

// ─────────────────────────────────────────
// TAGS
// ─────────────────────────────────────────

let tagId: string

describe('POST /api/v1/task-tags', () => {
  it('should create a tag', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/task-tags')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bug', color: '#EF4444', customerId })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('tagId')
    tagId = (res.body as { tagId: string }).tagId
  })
})

describe('GET /api/v1/task-tags', () => {
  it('should list tags for a customer', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/task-tags?customerId=${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const body = res.body as { tags: unknown[] }
    expect(body.tags.length).toBeGreaterThan(0)
  })
})

describe('POST /api/v1/customers/:customerId/tasks/:taskId/tags/:tagId', () => {
  it('should attach a tag to a task', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customerId}/tasks/${taskId}/tags/${tagId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)
  })
})

describe('DELETE /api/v1/customers/:customerId/tasks/:taskId/tags/:tagId', () => {
  it('should detach a tag from a task', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/tasks/${taskId}/tags/${tagId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)
  })
})

// ─────────────────────────────────────────
// SOFT DELETE
// ─────────────────────────────────────────

describe('DELETE /api/v1/customers/:customerId/tasks/:taskId', () => {
  it('should soft delete a task', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customerId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)
  })

  it('should not return deleted task in list', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}/tasks`)
      .set('Authorization', `Bearer ${adminToken}`)

    const body = res.body as { items: Array<{ id: string }> }
    expect(body.items.find((t) => t.id === taskId)).toBeUndefined()
  })
})
