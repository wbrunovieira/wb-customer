import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { IMeetingTypeRepository } from '../repositories/i-meeting-type.repository'
import { MeetingType } from '../../enterprise/entities/meeting-type'

export type ListMeetingTypesResult = Either<never, { meetingTypes: MeetingType[] }>

@Injectable()
export class ListMeetingTypesUseCase {
  constructor(private readonly meetingTypeRepo: IMeetingTypeRepository) {}

  async execute(onlyActive = true): Promise<ListMeetingTypesResult> {
    const meetingTypes = await this.meetingTypeRepo.findAll(onlyActive)
    return right({ meetingTypes })
  }
}
