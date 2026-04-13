import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMeetingTypeRepository } from '../repositories/i-meeting-type.repository'
import { MeetingType } from '../../enterprise/entities/meeting-type'
import { MeetingTypeAlreadyExistsError } from '../../domain/exceptions/meeting-type-already-exists.error'

export interface CreateMeetingTypeRequest {
  name: string
  description?: string
  durationMinutes?: number
  color?: string
}

export type CreateMeetingTypeResult = Either<MeetingTypeAlreadyExistsError, { meetingTypeId: string }>

@Injectable()
export class CreateMeetingTypeUseCase {
  constructor(private readonly meetingTypeRepo: IMeetingTypeRepository) {}

  async execute(request: CreateMeetingTypeRequest): Promise<CreateMeetingTypeResult> {
    const existing = await this.meetingTypeRepo.findByName(request.name)
    if (existing) {
      return left(new MeetingTypeAlreadyExistsError(request.name))
    }

    const meetingType = MeetingType.create({
      name: request.name,
      description: request.description,
      durationMinutes: request.durationMinutes,
      color: request.color,
    })

    await this.meetingTypeRepo.save(meetingType)
    return right({ meetingTypeId: meetingType.id.value })
  }
}
