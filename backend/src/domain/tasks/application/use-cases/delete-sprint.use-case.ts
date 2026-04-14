import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ISprintRepository } from '../repositories/i-sprint.repository'
import { SprintNotFoundError } from '../../domain/exceptions/sprint-not-found.error'

export type DeleteSprintResult = Either<SprintNotFoundError, void>

@Injectable()
export class DeleteSprintUseCase {
  constructor(private readonly sprintRepo: ISprintRepository) {}

  async execute(req: { sprintId: string }): Promise<DeleteSprintResult> {
    const sprint = await this.sprintRepo.findById(req.sprintId)
    if (!sprint) return left(new SprintNotFoundError(req.sprintId))
    await this.sprintRepo.delete(req.sprintId)
    return right(undefined)
  }
}
