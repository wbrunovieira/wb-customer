import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskRepository } from '../repositories/i-task.repository'
import { IChecklistItemRepository } from '../repositories/i-checklist-item.repository'
import { ChecklistItem } from '../../enterprise/entities/checklist-item'
import { TaskNotFoundError } from '../../domain/exceptions/task-not-found.error'

export type AddChecklistItemResult = Either<TaskNotFoundError, { itemId: string }>

@Injectable()
export class AddChecklistItemUseCase {
  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly checklistRepo: IChecklistItemRepository,
  ) {}

  async execute(req: { taskId: string; customerId: string; text: string; position?: number }): Promise<AddChecklistItemResult> {
    const task = await this.taskRepo.findById(req.taskId)
    if (!task || task.customerId !== req.customerId) return left(new TaskNotFoundError(req.taskId))

    const item = ChecklistItem.create({ taskId: req.taskId, text: req.text, isDone: false, position: req.position ?? 0 })
    await this.checklistRepo.save(item)
    return right({ itemId: item.id.value })
  }
}
