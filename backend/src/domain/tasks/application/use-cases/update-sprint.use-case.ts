import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ISprintRepository } from '../repositories/i-sprint.repository'
import { SprintNotFoundError } from '../../domain/exceptions/sprint-not-found.error'

export type UpdateSprintResult = Either<SprintNotFoundError, { sprintId: string }>

@Injectable()
export class UpdateSprintUseCase {
  constructor(private readonly sprintRepo: ISprintRepository) {}

  async execute(req: { sprintId: string; name?: string; startAt?: Date; endAt?: Date }): Promise<UpdateSprintResult> {
    const sprint = await this.sprintRepo.findById(req.sprintId)
    if (!sprint) return left(new SprintNotFoundError(req.sprintId))
    sprint.update({ name: req.name, startAt: req.startAt, endAt: req.endAt })
    await this.sprintRepo.save(sprint)
    return right({ sprintId: sprint.id.value })
  }
}
