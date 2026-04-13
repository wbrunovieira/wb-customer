import { DomainEvent } from '@/core/domain/domain-event'

export class CustomerAssignedEvent implements DomainEvent {
  occurredAt: Date = new Date()

  constructor(
    public readonly customerId: string,
    public readonly userId: string,
    public readonly assignedBy: string,
  ) {}

  getAggregateId(): string {
    return this.customerId
  }
}
