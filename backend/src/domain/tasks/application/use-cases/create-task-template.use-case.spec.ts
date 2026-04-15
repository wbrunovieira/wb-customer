import { describe, it, expect, beforeEach } from 'vitest'
import { CreateTaskTemplateUseCase } from './create-task-template.use-case'
import { InMemoryTaskTemplateRepository } from '@/test/repositories/tasks/in-memory-task-template.repository'

let repo: InMemoryTaskTemplateRepository
let sut: CreateTaskTemplateUseCase

beforeEach(() => {
  repo = new InMemoryTaskTemplateRepository()
  sut = new CreateTaskTemplateUseCase(repo)
})

describe('CreateTaskTemplateUseCase', () => {
  it('should create a template and persist it', async () => {
    const result = await sut.execute({
      name: 'Onboarding',
      description: 'Standard onboarding tasks',
      tasks: [
        { title: 'Setup account', status: 'todo' },
        { title: 'Send welcome email', estimatedHours: 0.5 },
      ],
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value.templateId).toBeDefined()
    expect(repo.items).toHaveLength(1)
    expect(repo.items[0].name).toBe('Onboarding')
    expect(repo.items[0].tasks).toHaveLength(2)
  })

  it('should require at least one task', async () => {
    const result = await sut.execute({ name: 'Empty', tasks: [] })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) expect(result.value.message).toMatch(/ao menos uma tarefa/i)
  })

  it('should require a name', async () => {
    const result = await sut.execute({ name: '', tasks: [{ title: 'Task' }] })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) expect(result.value.message).toMatch(/nome/i)
  })
})
