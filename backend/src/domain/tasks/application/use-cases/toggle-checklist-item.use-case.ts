import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IChecklistItemRepository } from '../repositories/i-checklist-item.repository'
import { ITaskRepository } from '../repositories/i-task.repository'

export type ToggleChecklistItemResult = Either<Error, { isDone: boolean; progress: number }>

@Injectable()
export class ToggleChecklistItemUseCase {
  constructor(
    private readonly checklistRepo: IChecklistItemRepository,
    private readonly taskRepo: ITaskRepository,
  ) {}

  async execute(req: { itemId: string; taskId: string; customerId: string }): Promise<ToggleChecklistItemResult> {
    const task = await this.taskRepo.findById(req.taskId)
    if (!task || task.customerId !== req.customerId) return left(new Error('Task not found'))

    const item = await this.checklistRepo.findById(req.itemId)
    if (!item || item.taskId !== req.taskId) return left(new Error('Checklist item not found'))

    item.toggle()
    await this.checklistRepo.save(item)

    // Recalculate progress
    const allItems = await this.checklistRepo.findByTaskId(req.taskId)
    const completed = allItems.filter(i => i.isDone).length
    task.recalculateProgress(completed, allItems.length)
    await this.taskRepo.save(task)

    return right({ isDone: item.isDone, progress: task.progress })
  }
}
