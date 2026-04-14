import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITaskRepository, FindManyTasksParams, PaginatedTasks } from '../repositories/i-task.repository'

export type ListCustomerTasksResult = Either<never, PaginatedTasks>

@Injectable()
export class ListCustomerTasksUseCase {
  constructor(private readonly taskRepo: ITaskRepository) {}

  async execute(req: { customerId: string } & FindManyTasksParams): Promise<ListCustomerTasksResult> {
    const { customerId, ...params } = req
    const result = await this.taskRepo.findByCustomerId(customerId, params)
    return right(result)
  }
}
