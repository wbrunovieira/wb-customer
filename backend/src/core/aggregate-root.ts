import { Entity } from './entity'
import { UniqueEntityID } from './unique-entity-id'
import { DomainEvent } from './domain/domain-event'

export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domainEvents: DomainEvent[] = []

  get domainEvents(): DomainEvent[] {
    return this._domainEvents
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent)
  }

  clearEvents(): void {
    this._domainEvents = []
  }

  protected constructor(props: Props, id?: UniqueEntityID) {
    super(props, id)
  }
}
