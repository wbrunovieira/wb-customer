import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMeetingTypeRepository } from '../repositories/i-meeting-type.repository'
import { MeetingTypeNotFoundError } from '../../domain/exceptions/meeting-type-not-found.error'

export interface UpdateMeetingTypeRequest {
  meetingTypeId: string
  name?: string
  description?: string
  durationMinutes?: number
  color?: string
  isActive?: boolean
}

export type UpdateMeetingTypeResult = Either<MeetingTypeNotFoundError, void>

@Injectable()
export class UpdateMeetingTypeUseCase {
  constructor(private readonly meetingTypeRepo: IMeetingTypeRepository) {}

  async execute(request: UpdateMeetingTypeRequest): Promise<UpdateMeetingTypeResult> {
    const meetingType = await this.meetingTypeRepo.findById(request.meetingTypeId)
    if (!meetingType) {
      return left(new MeetingTypeNotFoundError(request.meetingTypeId))
    }

    meetingType.update({
      name: request.name,
      description: request.description,
      durationMinutes: request.durationMinutes,
      color: request.color,
      isActive: request.isActive,
    })

    await this.meetingTypeRepo.save(meetingType)
    return right(undefined)
  }
}
