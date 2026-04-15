import { describe, it, expect, beforeEach } from 'vitest'
import { CreateTemplateFromTasksUseCase } from './create-template-from-tasks.use-case'
import { InMemoryTaskRepository } from '@/test/repositories/tasks/in-memory-task.repository'
import { InMemoryTaskTemplateRepository } from '@/test/repositories/tasks/in-memory-task-template.repository'
import { Task } from '../../enterprise/entities/task'
import { TaskStatus } from '../../enterprise/value-objects/task-status.vo'
import { RecurrenceType } from '../../enterprise/value-objects/recurrence-type.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'

function makeTask(id: string, overrides: Partial<{ title: string; estimatedHours: number; impact: number }> = {}): Task {
  return Task.restore(
    {
      customerId: 'c1',
      title: overrides.title ?? `Task ${id}`,
      status: TaskStatus.createUnsafe('todo'),
      ownerUserId: 'u1',
      trackedSeconds: 0,
      progress: 0,
      boardPosition: 0,
      recurrenceType: RecurrenceType.createUnsafe('none'),
      estimatedHours: overrides.estimatedHours ?? null,
      impact: overrides.impact ?? null,
      confidence: null,
      effort: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    new UniqueEntityID(id),
  )
}

let taskRepo: InMemoryTaskRepository
let templateRepo: InMemoryTaskTemplateRepository
let sut: CreateTemplateFromTasksUseCase

beforeEach(() => {
  taskRepo = new InMemoryTaskRepository()
  templateRepo = new InMemoryTaskTemplateRepository()
  sut = new CreateTemplateFromTasksUseCase(taskRepo, templateRepo)
})

describe('CreateTemplateFromTasksUseCase', () => {
  it('should build a template from the given task ids', async () => {
    taskRepo.items = [
      makeTask('t1', { title: 'Design', estimatedHours: 2, impact: 5 }),
      makeTask('t2', { title: 'Develop', estimatedHours: 8 }),
      makeTask('t3', { title: 'Deploy' }),
    ]

    const result = await sut.execute({ name: 'Release Process', taskIds: ['t1', 't2', 't3'] })

    expect(result.isRight()).toBe(true)
    expect(templateRepo.items).toHaveLength(1)
    const tpl = templateRepo.items[0]
    expect(tpl.name).toBe('Release Process')
    expect(tpl.tasks).toHaveLength(3)
    expect(tpl.tasks[0].title).toBe('Design')
    expect(tpl.tasks[0].estimatedHours).toBe(2)
    expect(tpl.tasks[0].impact).toBe(5)
  })

  it('should ignore task ids that are not found', async () => {
    taskRepo.items = [makeTask('t1', { title: 'Real task' })]

    const result = await sut.execute({ name: 'Partial', taskIds: ['t1', 'ghost'] })

    expect(result.isRight()).toBe(true)
    expect(templateRepo.items[0].tasks).toHaveLength(1)
  })

  it('should fail when no valid tasks are found', async () => {
    const result = await sut.execute({ name: 'Empty', taskIds: ['ghost'] })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) expect(result.value.message).toMatch(/nenhuma tarefa encontrada/i)
  })

  it('should fail with empty name', async () => {
    taskRepo.items = [makeTask('t1')]
    const result = await sut.execute({ name: '', taskIds: ['t1'] })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) expect(result.value.message).toMatch(/nome/i)
  })
})
