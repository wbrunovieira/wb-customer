import { IMeetingTypeRepository } from '@/domain/meetings/application/repositories/i-meeting-type.repository'
import { MeetingType } from '@/domain/meetings/enterprise/entities/meeting-type'

export class InMemoryMeetingTypeRepository implements IMeetingTypeRepository {
  public items: MeetingType[] = []

  async findById(id: string): Promise<MeetingType | null> {
    return this.items.find((t) => t.id.value === id && !t.isDeleted) ?? null
  }

  async findByName(name: string): Promise<MeetingType | null> {
    return this.items.find((t) => t.name === name && !t.isDeleted) ?? null
  }

  async findAll(onlyActive = true): Promise<MeetingType[]> {
    let result = this.items.filter((t) => !t.isDeleted)
    if (onlyActive) result = result.filter((t) => t.isActive)
    return result
  }

  async save(meetingType: MeetingType): Promise<void> {
    const index = this.items.findIndex((t) => t.id.equals(meetingType.id))
    if (index >= 0) {
      this.items[index] = meetingType
    } else {
      this.items.push(meetingType)
    }
  }
}
