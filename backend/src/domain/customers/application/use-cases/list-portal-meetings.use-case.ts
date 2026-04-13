import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { IMeetingRepository, PaginatedMeetings } from '@/domain/meetings/application/repositories/i-meeting.repository'

export interface ListPortalMeetingsRequest {
  customerId: string
  status?: string
  page?: number
  limit?: number
}

export type ListPortalMeetingsResult = Either<never, PaginatedMeetings>

@Injectable()
export class ListPortalMeetingsUseCase {
  constructor(private readonly meetingRepo: IMeetingRepository) {}

  async execute(request: ListPortalMeetingsRequest): Promise<ListPortalMeetingsResult> {
    const result = await this.meetingRepo.findByCustomerId(request.customerId, {
      status: request.status,
      page: request.page,
      limit: request.limit,
    })
    return right(result)
  }
}
