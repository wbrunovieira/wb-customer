import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITaskTagRepository } from '../repositories/i-task-tag.repository'

export type DetachTaskTagResult = Either<never, void>

@Injectable()
export class DetachTaskTagUseCase {
  constructor(private readonly tagRepo: ITaskTagRepository) {}

  async execute(req: { taskId: string; tagId: string }): Promise<DetachTaskTagResult> {
    await this.tagRepo.detachFromTask(req.taskId, req.tagId)
    return right(undefined)
  }
}
