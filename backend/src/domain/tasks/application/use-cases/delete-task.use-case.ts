import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskRepository } from '../repositories/i-task.repository'
import { TaskNotFoundError } from '../../domain/exceptions/task-not-found.error'

export type DeleteTaskResult = Either<TaskNotFoundError, void>

@Injectable()
export class DeleteTaskUseCase {
  constructor(private readonly taskRepo: ITaskRepository) {}

  async execute(req: { taskId: string; customerId: string }): Promise<DeleteTaskResult> {
    const task = await this.taskRepo.findById(req.taskId)
    if (!task || task.customerId !== req.customerId) return left(new TaskNotFoundError(req.taskId))
    task.softDelete()
    await this.taskRepo.save(task)
    return right(undefined)
  }
}
