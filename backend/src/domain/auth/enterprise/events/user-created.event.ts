import { DomainEvent } from '@/core/domain/domain-event'

export class UserCreatedEvent implements DomainEvent {
  occurredAt: Date = new Date()

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly role: string,
  ) {}

  getAggregateId(): string {
    return this.userId
  }
}
