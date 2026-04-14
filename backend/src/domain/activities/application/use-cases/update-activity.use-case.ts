import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IActivityRepository } from '../repositories/i-activity.repository'
import { ActivityNotFoundError } from '../../domain/exceptions/activity-not-found.error'

export interface UpdateActivityRequest {
  activityId: string
  subject?: string
  description?: string
  status?: string
  scheduledAt?: Date | null
  occurredAt?: Date | null
  durationSecs?: number | null
  assignedToUserId?: string | null
  transcriptText?: string | null
}

export type UpdateActivityResult = Either<ActivityNotFoundError, { activityId: string }>

@Injectable()
export class UpdateActivityUseCase {
  constructor(private readonly repo: IActivityRepository) {}

  async execute(req: UpdateActivityRequest): Promise<UpdateActivityResult> {
    const activity = await this.repo.findById(req.activityId)
    if (!activity) return left(new ActivityNotFoundError())

    activity.update({
      subject: req.subject,
      description: req.description,
      status: req.status,
      scheduledAt: req.scheduledAt,
      occurredAt: req.occurredAt,
      durationSecs: req.durationSecs ?? undefined,
      assignedToUserId: req.assignedToUserId,
      transcriptText: req.transcriptText,
    })
    await this.repo.save(activity)
    return right({ activityId: activity.id.value })
  }
}
