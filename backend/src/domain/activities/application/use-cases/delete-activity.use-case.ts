import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IActivityRepository } from '../repositories/i-activity.repository'
import { ActivityNotFoundError } from '../../domain/exceptions/activity-not-found.error'

export type DeleteActivityResult = Either<ActivityNotFoundError, void>

@Injectable()
export class DeleteActivityUseCase {
  constructor(private readonly repo: IActivityRepository) {}

  async execute(activityId: string): Promise<DeleteActivityResult> {
    const activity = await this.repo.findById(activityId)
    if (!activity) return left(new ActivityNotFoundError())
    activity.softDelete()
    await this.repo.save(activity)
    return right(undefined)
  }
}
