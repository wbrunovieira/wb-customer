import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskRepository } from '../repositories/i-task.repository'
import { Task } from '../../enterprise/entities/task'
import { TaskNotFoundError } from '../../domain/exceptions/task-not-found.error'

export type GetTaskResult = Either<TaskNotFoundError, { task: Task }>

@Injectable()
export class GetTaskUseCase {
  constructor(private readonly taskRepo: ITaskRepository) {}

  async execute(req: { taskId: string; customerId: string }): Promise<GetTaskResult> {
    const task = await this.taskRepo.findById(req.taskId)
    if (!task || task.customerId !== req.customerId || task.deletedAt !== null) {
      return left(new TaskNotFoundError(req.taskId))
    }
    return right({ task })
  }
}
