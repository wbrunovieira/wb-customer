import { DomainEvent } from '@/core/domain/domain-event'

export class DocumentUploadedEvent implements DomainEvent {
  public readonly occurredAt: Date = new Date()

  constructor(
    public readonly documentId: string,
    public readonly customerId: string,
    public readonly uploadedByUserId: string,
    public readonly title: string,
  ) {}

  getAggregateId(): string {
    return this.documentId
  }
}
