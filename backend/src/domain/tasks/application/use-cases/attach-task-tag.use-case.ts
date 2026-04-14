import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskRepository } from '../repositories/i-task.repository'
import { ITaskTagRepository } from '../repositories/i-task-tag.repository'
import { TaskNotFoundError } from '../../domain/exceptions/task-not-found.error'
import { TaskTagNotFoundError } from '../../domain/exceptions/task-tag-not-found.error'

export type AttachTaskTagResult = Either<TaskNotFoundError | TaskTagNotFoundError, void>

@Injectable()
export class AttachTaskTagUseCase {
  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly tagRepo: ITaskTagRepository,
  ) {}

  async execute(req: { taskId: string; tagId: string; customerId: string }): Promise<AttachTaskTagResult> {
    const task = await this.taskRepo.findById(req.taskId)
    if (!task || task.customerId !== req.customerId) return left(new TaskNotFoundError(req.taskId))
    const tag = await this.tagRepo.findById(req.tagId)
    if (!tag) return left(new TaskTagNotFoundError(req.tagId))
    await this.tagRepo.attachToTask(req.taskId, req.tagId)
    return right(undefined)
  }
}
