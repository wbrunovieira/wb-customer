import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMeetingTypeRepository } from '../repositories/i-meeting-type.repository'
import { MeetingTypeNotFoundError } from '../../domain/exceptions/meeting-type-not-found.error'

export type DeleteMeetingTypeResult = Either<MeetingTypeNotFoundError, void>

@Injectable()
export class DeleteMeetingTypeUseCase {
  constructor(private readonly meetingTypeRepo: IMeetingTypeRepository) {}

  async execute(meetingTypeId: string): Promise<DeleteMeetingTypeResult> {
    const meetingType = await this.meetingTypeRepo.findById(meetingTypeId)
    if (!meetingType) {
      return left(new MeetingTypeNotFoundError(meetingTypeId))
    }

    meetingType.softDelete()
    await this.meetingTypeRepo.save(meetingType)
    return right(undefined)
  }
}
