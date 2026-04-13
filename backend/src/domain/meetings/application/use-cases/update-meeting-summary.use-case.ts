import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMeetingRepository } from '../repositories/i-meeting.repository'
import { MeetingNotFoundError } from '../../domain/exceptions/meeting-not-found.error'

export type UpdateMeetingSummaryResult = Either<MeetingNotFoundError, void>

@Injectable()
export class UpdateMeetingSummaryUseCase {
  constructor(private readonly meetingRepo: IMeetingRepository) {}

  async execute(request: {
    meetingId: string
    summary: string | null
  }): Promise<UpdateMeetingSummaryResult> {
    const meeting = await this.meetingRepo.findById(request.meetingId)
    if (!meeting) {
      return left(new MeetingNotFoundError(request.meetingId))
    }

    meeting.updateSummary(request.summary)
    await this.meetingRepo.save(meeting)
    return right(undefined)
  }
}
