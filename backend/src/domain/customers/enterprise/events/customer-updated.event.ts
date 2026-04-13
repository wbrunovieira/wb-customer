import { DomainEvent } from '@/core/domain/domain-event'

export class CustomerUpdatedEvent implements DomainEvent {
  occurredAt: Date = new Date()

  constructor(
    public readonly customerId: string,
    public readonly updatedByUserId: string,
  ) {}

  getAggregateId(): string {
    return this.customerId
  }
}
