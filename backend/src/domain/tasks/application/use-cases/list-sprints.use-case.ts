import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ISprintRepository } from '../repositories/i-sprint.repository'
import { Sprint } from '../../enterprise/entities/sprint'

export type ListSprintsResult = Either<never, { sprints: Sprint[] }>

@Injectable()
export class ListSprintsUseCase {
  constructor(private readonly sprintRepo: ISprintRepository) {}

  async execute(req: { customerId: string }): Promise<ListSprintsResult> {
    const sprints = await this.sprintRepo.findByCustomerId(req.customerId)
    return right({ sprints })
  }
}
