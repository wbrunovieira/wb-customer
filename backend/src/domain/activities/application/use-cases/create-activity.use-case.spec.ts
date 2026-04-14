import { describe, it, expect, beforeEach } from 'vitest'
import { CreateActivityUseCase } from './create-activity.use-case'
import { InMemoryActivityRepository } from '@/test/repositories/activities/in-memory-activity.repository'

let repo: InMemoryActivityRepository
let sut: CreateActivityUseCase

beforeEach(() => {
  repo = new InMemoryActivityRepository()
  sut = new CreateActivityUseCase(repo)
})

describe('CreateActivityUseCase', () => {
  it('should create an activity with default status open', async () => {
    const result = await sut.execute({
      customerId: 'c1',
      type: 'note',
      subject: 'First call',
      createdByUserId: 'u1',
    })
    expect(result.isRight()).toBe(true)
    expect(repo.items).toHaveLength(1)
    expect(repo.items[0].status).toBe('open')
  })

  it('should create a scheduled activity', async () => {
    const scheduledAt = new Date('2026-05-01')
    const result = await sut.execute({
      customerId: 'c1',
      type: 'phone_call',
      status: 'scheduled',
      scheduledAt,
      createdByUserId: 'u1',
    })
    expect(result.isRight()).toBe(true)
    expect(repo.items[0].status).toBe('scheduled')
    expect(repo.items[0].scheduledAt).toEqual(scheduledAt)
  })

  it('should persist type and description', async () => {
    await sut.execute({
      customerId: 'c1',
      type: 'email',
      subject: 'Proposta enviada',
      description: 'Enviamos a proposta por email.',
      createdByUserId: 'u1',
    })
    expect(repo.items[0].type).toBe('email')
    expect(repo.items[0].subject).toBe('Proposta enviada')
    expect(repo.items[0].description).toBe('Enviamos a proposta por email.')
  })
})
