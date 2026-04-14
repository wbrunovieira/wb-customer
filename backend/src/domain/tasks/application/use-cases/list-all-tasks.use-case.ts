import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITaskRepository, FindAllTasksParams, PaginatedTasks } from '../repositories/i-task.repository'

export type ListAllTasksResult = Either<never, PaginatedTasks>

@Injectable()
export class ListAllTasksUseCase {
  constructor(private readonly taskRepo: ITaskRepository) {}

  async execute(params: FindAllTasksParams): Promise<ListAllTasksResult> {
    const result = await this.taskRepo.findAll(params)
    return right(result)
  }
}
