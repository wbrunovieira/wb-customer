import { DomainEvent } from '@/core/domain/domain-event'

export class TaskStatusChangedEvent implements DomainEvent {
  readonly occurredAt = new Date()
  constructor(
    public readonly taskId: string,
    public readonly customerId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
  ) {}

  getAggregateId(): string { return this.taskId }
}
