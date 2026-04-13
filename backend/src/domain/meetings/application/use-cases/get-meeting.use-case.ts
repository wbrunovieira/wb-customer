import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMeetingRepository } from '../repositories/i-meeting.repository'
import { Meeting } from '../../enterprise/entities/meeting'
import { MeetingNotFoundError } from '../../domain/exceptions/meeting-not-found.error'

export type GetMeetingResult = Either<MeetingNotFoundError, { meeting: Meeting }>

@Injectable()
export class GetMeetingUseCase {
  constructor(private readonly meetingRepo: IMeetingRepository) {}

  async execute(request: { customerId: string; meetingId: string }): Promise<GetMeetingResult> {
    const meeting = await this.meetingRepo.findById(request.meetingId)
    if (!meeting || meeting.customerId !== request.customerId) {
      return left(new MeetingNotFoundError(request.meetingId))
    }
    return right({ meeting })
  }
}
