import { MeetingType } from '../../enterprise/entities/meeting-type'

export abstract class IMeetingTypeRepository {
  abstract findById(id: string): Promise<MeetingType | null>
  abstract findByName(name: string): Promise<MeetingType | null>
  abstract findAll(onlyActive?: boolean): Promise<MeetingType[]>
  abstract save(meetingType: MeetingType): Promise<void>
}
