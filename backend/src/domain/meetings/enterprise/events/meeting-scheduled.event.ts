import { DomainEvent } from '@/core/domain/domain-event'

export class MeetingScheduledEvent implements DomainEvent {
  public readonly occurredAt: Date = new Date()

  constructor(
    public readonly meetingId: string,
    public readonly customerId: string,
    public readonly scheduledByUserId: string,
    public readonly title: string,
  ) {}

  getAggregateId(): string {
    return this.meetingId
  }
}
