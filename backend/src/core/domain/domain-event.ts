export interface DomainEvent {
  occurredAt: Date
  getAggregateId(): string
}
