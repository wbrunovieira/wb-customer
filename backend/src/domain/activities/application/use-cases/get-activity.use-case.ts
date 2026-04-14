import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IActivityRepository } from '../repositories/i-activity.repository'
import { Activity } from '../../enterprise/entities/activity'
import { ActivityNotFoundError } from '../../domain/exceptions/activity-not-found.error'

export type GetActivityResult = Either<ActivityNotFoundError, { activity: Activity }>

@Injectable()
export class GetActivityUseCase {
  constructor(private readonly repo: IActivityRepository) {}

  async execute(activityId: string): Promise<GetActivityResult> {
    const activity = await this.repo.findById(activityId)
    if (!activity) return left(new ActivityNotFoundError())
    return right({ activity })
  }
}
