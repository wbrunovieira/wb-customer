import { DomainEvent } from '@/core/domain/domain-event'

export class CustomerCreatedEvent implements DomainEvent {
  occurredAt: Date = new Date()

  constructor(
    public readonly customerId: string,
    public readonly name: string,
    public readonly createdByUserId: string,
  ) {}

  getAggregateId(): string {
    return this.customerId
  }
}
