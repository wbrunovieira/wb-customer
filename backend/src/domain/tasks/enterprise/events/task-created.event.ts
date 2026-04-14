import { DomainEvent } from '@/core/domain/domain-event'

export class TaskCreatedEvent implements DomainEvent {
  readonly occurredAt = new Date()
  constructor(
    public readonly taskId: string,
    public readonly customerId: string,
    public readonly ownerUserId: string,
    public readonly title: string,
  ) {}

  getAggregateId(): string { return this.taskId }
}
