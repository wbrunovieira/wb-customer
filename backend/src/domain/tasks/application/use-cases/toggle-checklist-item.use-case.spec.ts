import { describe, it, expect, beforeEach } from 'vitest'
import { ToggleChecklistItemUseCase } from './toggle-checklist-item.use-case'
import { InMemoryChecklistItemRepository } from '@/test/repositories/tasks/in-memory-checklist-item.repository'
import { InMemoryTaskRepository } from '@/test/repositories/tasks/in-memory-task.repository'
import { Task } from '../../enterprise/entities/task'
import { TaskStatus } from '../../enterprise/value-objects/task-status.vo'
import { RecurrenceType } from '../../enterprise/value-objects/recurrence-type.vo'
import { ChecklistItem } from '../../enterprise/entities/checklist-item'

let checklistRepo: InMemoryChecklistItemRepository
let taskRepo: InMemoryTaskRepository
let sut: ToggleChecklistItemUseCase

beforeEach(() => {
  checklistRepo = new InMemoryChecklistItemRepository()
  taskRepo = new InMemoryTaskRepository()
  sut = new ToggleChecklistItemUseCase(checklistRepo, taskRepo)
})

describe('ToggleChecklistItemUseCase', () => {
  it('should toggle item and recalculate progress', async () => {
    const task = Task.create({ customerId: 'c1', title: 'T', status: TaskStatus.createUnsafe('in_progress'), ownerUserId: 'u1', recurrenceType: RecurrenceType.createUnsafe('none') })
    taskRepo.items.push(task)

    const item1 = ChecklistItem.create({ taskId: task.id.value, text: 'Step 1', isDone: false, position: 0 })
    const item2 = ChecklistItem.create({ taskId: task.id.value, text: 'Step 2', isDone: false, position: 1 })
    checklistRepo.items.push(item1, item2)

    const result = await sut.execute({ itemId: item1.id.value, taskId: task.id.value, customerId: 'c1' })
    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.isDone).toBe(true)
      expect(result.value.progress).toBe(50)
    }
  })
})
