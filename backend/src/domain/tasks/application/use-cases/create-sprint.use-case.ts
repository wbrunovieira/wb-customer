import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ISprintRepository } from '../repositories/i-sprint.repository'
import { Sprint } from '../../enterprise/entities/sprint'

export interface CreateSprintRequest {
  customerId: string
  name: string
  startAt: Date
  endAt: Date
}

export interface CreateSprintResponse { sprintId: string }

export type CreateSprintResult = Either<never, CreateSprintResponse>

@Injectable()
export class CreateSprintUseCase {
  constructor(private readonly sprintRepo: ISprintRepository) {}

  async execute(req: CreateSprintRequest): Promise<CreateSprintResult> {
    const sprint = Sprint.create({
      customerId: req.customerId,
      name: req.name,
      startAt: req.startAt,
      endAt: req.endAt,
    })
    await this.sprintRepo.save(sprint)
    return right({ sprintId: sprint.id.value })
  }
}
