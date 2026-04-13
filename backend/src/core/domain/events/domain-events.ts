import { AggregateRoot } from '../../aggregate-root'
import { UniqueEntityID } from '../../unique-entity-id'
import { DomainEvent } from '../domain-event'

type EventHandler = (event: DomainEvent) => void | Promise<void>

export class DomainEvents {
  private static handlersMap: Map<string, EventHandler[]> = new Map()
  private static markedAggregates: AggregateRoot<unknown>[] = []

  static markAggregateForDispatch(aggregate: AggregateRoot<unknown>): void {
    const alreadyMarked = DomainEvents.markedAggregates.some((a) =>
      a.id.equals(aggregate.id),
    )
    if (!alreadyMarked) {
      DomainEvents.markedAggregates.push(aggregate)
    }
  }

  static async dispatchEventsForAggregate(id: UniqueEntityID): Promise<void> {
    const aggregate = DomainEvents.markedAggregates.find((a) =>
      a.id.equals(id),
    )
    if (aggregate) {
      await DomainEvents.dispatchAggregateEvents(aggregate)
      aggregate.clearEvents()
      DomainEvents.removeAggregateFromMarkedList(aggregate)
    }
  }

  static register(handler: EventHandler, eventClassName: string): void {
    if (!DomainEvents.handlersMap.has(eventClassName)) {
      DomainEvents.handlersMap.set(eventClassName, [])
    }
    DomainEvents.handlersMap.get(eventClassName)!.push(handler)
  }

  static clearHandlers(): void {
    DomainEvents.handlersMap = new Map()
  }

  static clearMarkedAggregates(): void {
    DomainEvents.markedAggregates = []
  }

  private static async dispatchAggregateEvents(
    aggregate: AggregateRoot<unknown>,
  ): Promise<void> {
    for (const event of aggregate.domainEvents) {
      await DomainEvents.dispatch(event)
    }
  }

  private static removeAggregateFromMarkedList(
    aggregate: AggregateRoot<unknown>,
  ): void {
    DomainEvents.markedAggregates = DomainEvents.markedAggregates.filter(
      (a) => !a.id.equals(aggregate.id),
    )
  }

  private static async dispatch(event: DomainEvent): Promise<void> {
    const eventName = event.constructor.name
    const handlers = DomainEvents.handlersMap.get(eventName) ?? []
    for (const handler of handlers) {
      await handler(event)
    }
  }
}
