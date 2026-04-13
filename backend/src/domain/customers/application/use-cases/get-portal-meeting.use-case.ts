import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMeetingRepository } from '@/domain/meetings/application/repositories/i-meeting.repository'
import { Meeting } from '@/domain/meetings/enterprise/entities/meeting'
import { MeetingNotFoundError } from '@/domain/meetings/domain/exceptions/meeting-not-found.error'

export type GetPortalMeetingResult = Either<MeetingNotFoundError, { meeting: Meeting }>

@Injectable()
export class GetPortalMeetingUseCase {
  constructor(private readonly meetingRepo: IMeetingRepository) {}

  async execute(request: {
    customerId: string
    meetingId: string
  }): Promise<GetPortalMeetingResult> {
    const meeting = await this.meetingRepo.findById(request.meetingId)
    if (!meeting || meeting.customerId !== request.customerId) {
      return left(new MeetingNotFoundError(request.meetingId))
    }
    return right({ meeting })
  }
}
