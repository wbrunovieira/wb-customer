import { DomainEvent } from '@/core/domain/domain-event'

export class MeetingCompletedEvent implements DomainEvent {
  public readonly occurredAt: Date = new Date()

  constructor(
    public readonly meetingId: string,
    public readonly customerId: string,
  ) {}

  getAggregateId(): string {
    return this.meetingId
  }
}
