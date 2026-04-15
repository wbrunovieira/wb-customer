import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITaskRepository } from '../repositories/i-task.repository'

export interface ReorderTasksRequest {
  orderedIds: string[]
}

export type ReorderTasksResult = Either<never, void>

@Injectable()
export class ReorderTasksUseCase {
  constructor(private readonly taskRepo: ITaskRepository) {}

  async execute(req: ReorderTasksRequest): Promise<ReorderTasksResult> {
    await this.taskRepo.updateBoardPositions(
      req.orderedIds.map((id, index) => ({ id, boardPosition: index })),
    )
    return right(undefined)
  }
}
