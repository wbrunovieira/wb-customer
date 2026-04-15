import { describe, it, expect, beforeEach } from 'vitest'
import { ApplyTaskTemplateUseCase } from './apply-task-template.use-case'
import { InMemoryTaskTemplateRepository } from '@/test/repositories/tasks/in-memory-task-template.repository'
import { InMemoryTaskRepository } from '@/test/repositories/tasks/in-memory-task.repository'
import { InMemoryTaskActivityLogRepository } from '@/test/repositories/tasks/in-memory-task-activity-log.repository'
import { TaskTemplate } from '../../enterprise/entities/task-template'

let templateRepo: InMemoryTaskTemplateRepository
let taskRepo: InMemoryTaskRepository
let logRepo: InMemoryTaskActivityLogRepository
let sut: ApplyTaskTemplateUseCase

beforeEach(() => {
  templateRepo = new InMemoryTaskTemplateRepository()
  taskRepo = new InMemoryTaskRepository()
  logRepo = new InMemoryTaskActivityLogRepository()
  sut = new ApplyTaskTemplateUseCase(templateRepo, taskRepo, logRepo)
})

describe('ApplyTaskTemplateUseCase', () => {
  it('should create one task per template task for the given customer', async () => {
    const template = TaskTemplate.create({
      name: 'Onboarding',
      description: null,
      tasks: [
        { title: 'Setup account', status: 'todo', estimatedHours: 1 },
        { title: 'Send welcome email', status: 'todo' },
        { title: 'Schedule call', status: 'backlog', impact: 3, confidence: 7, effort: 2 },
      ],
    })
    templateRepo.items = [template]

    const result = await sut.execute({
      templateId: template.id.value,
      customerId: 'c1',
      ownerUserId: 'u1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value.taskIds).toHaveLength(3)
    expect(taskRepo.items).toHaveLength(3)
    expect(taskRepo.items[0].title).toBe('Setup account')
    expect(taskRepo.items[2].impact).toBe(3)
  })

  it('should return left when template is not found', async () => {
    const result = await sut.execute({
      templateId: 'nonexistent',
      customerId: 'c1',
      ownerUserId: 'u1',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) expect(result.value.message).toMatch(/template.*não encontrado/i)
  })

  it('should assign board positions sequentially', async () => {
    const template = TaskTemplate.create({
      name: 'Sprint',
      description: null,
      tasks: [{ title: 'A' }, { title: 'B' }, { title: 'C' }],
    })
    templateRepo.items = [template]

    await sut.execute({ templateId: template.id.value, customerId: 'c1', ownerUserId: 'u1' })

    const positions = taskRepo.items.map((t) => t.boardPosition)
    expect(positions).toEqual([0, 1, 2])
  })
})
