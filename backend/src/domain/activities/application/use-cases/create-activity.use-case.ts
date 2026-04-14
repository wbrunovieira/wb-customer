import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { IActivityRepository } from '../repositories/i-activity.repository'
import { Activity } from '../../enterprise/entities/activity'

export interface CreateActivityRequest {
  customerId: string
  contactId?: string
  type: string
  status?: string
  subject?: string
  description?: string
  scheduledAt?: Date
  occurredAt?: Date
  durationSecs?: number
  direction?: string
  createdByUserId: string
  assignedToUserId?: string
}

export interface CreateActivityResponse { activityId: string }
export type CreateActivityResult = Either<never, CreateActivityResponse>

@Injectable()
export class CreateActivityUseCase {
  constructor(private readonly repo: IActivityRepository) {}

  async execute(req: CreateActivityRequest): Promise<CreateActivityResult> {
    const activity = Activity.create({
      customerId: req.customerId,
      contactId: req.contactId,
      type: req.type,
      status: req.status,
      subject: req.subject,
      description: req.description,
      scheduledAt: req.scheduledAt,
      occurredAt: req.occurredAt,
      durationSecs: req.durationSecs,
      direction: req.direction,
      createdByUserId: req.createdByUserId,
      assignedToUserId: req.assignedToUserId,
    })
    await this.repo.save(activity)
    return right({ activityId: activity.id.value })
  }
}
