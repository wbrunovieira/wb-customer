import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DomainEvents } from './domain-events'
import { AggregateRoot } from '../../aggregate-root'
import { UniqueEntityID } from '../../unique-entity-id'
import { DomainEvent } from '../domain-event'

class OrderCreatedEvent implements DomainEvent {
  occurredAt = new Date()

  constructor(public readonly orderId: string) {}

  getAggregateId(): string {
    return this.orderId
  }
}

class OrderShippedEvent implements DomainEvent {
  occurredAt = new Date()

  constructor(public readonly orderId: string) {}

  getAggregateId(): string {
    return this.orderId
  }
}

interface OrderProps {
  status: string
}

class Order extends AggregateRoot<OrderProps> {
  static create(id?: UniqueEntityID): Order {
    const order = new Order({ status: 'pending' }, id)
    order.addDomainEvent(new OrderCreatedEvent(order.id.value))
    return order
  }

  ship(): void {
    this.addDomainEvent(new OrderShippedEvent(this.id.value))
  }
}

describe('DomainEvents', () => {
  beforeEach(() => {
    DomainEvents.clearHandlers()
    DomainEvents.clearMarkedAggregates()
  })

  describe('register()', () => {
    it('should register a handler for an event', async () => {
      const handler = vi.fn()
      DomainEvents.register(handler, OrderCreatedEvent.name)

      const order = Order.create()
      DomainEvents.markAggregateForDispatch(order)
      await DomainEvents.dispatchEventsForAggregate(order.id)

      expect(handler).toHaveBeenCalledOnce()
    })

    it('should register multiple handlers for the same event', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      DomainEvents.register(handler1, OrderCreatedEvent.name)
      DomainEvents.register(handler2, OrderCreatedEvent.name)

      const order = Order.create()
      DomainEvents.markAggregateForDispatch(order)
      await DomainEvents.dispatchEventsForAggregate(order.id)

      expect(handler1).toHaveBeenCalledOnce()
      expect(handler2).toHaveBeenCalledOnce()
    })
  })

  describe('markAggregateForDispatch()', () => {
    it('should not mark the same aggregate twice', async () => {
      const handler = vi.fn()
      DomainEvents.register(handler, OrderCreatedEvent.name)

      const order = Order.create()
      DomainEvents.markAggregateForDispatch(order)
      DomainEvents.markAggregateForDispatch(order)
      await DomainEvents.dispatchEventsForAggregate(order.id)

      expect(handler).toHaveBeenCalledOnce()
    })
  })

  describe('dispatchEventsForAggregate()', () => {
    it('should dispatch all events for the aggregate', async () => {
      const createdHandler = vi.fn()
      const shippedHandler = vi.fn()
      DomainEvents.register(createdHandler, OrderCreatedEvent.name)
      DomainEvents.register(shippedHandler, OrderShippedEvent.name)

      const order = Order.create()
      order.ship()
      DomainEvents.markAggregateForDispatch(order)
      await DomainEvents.dispatchEventsForAggregate(order.id)

      expect(createdHandler).toHaveBeenCalledOnce()
      expect(shippedHandler).toHaveBeenCalledOnce()
    })

    it('should clear events after dispatch', async () => {
      const order = Order.create()
      DomainEvents.markAggregateForDispatch(order)
      await DomainEvents.dispatchEventsForAggregate(order.id)

      expect(order.domainEvents).toHaveLength(0)
    })

    it('should do nothing for an unknown aggregate id', async () => {
      const handler = vi.fn()
      DomainEvents.register(handler, OrderCreatedEvent.name)

      await DomainEvents.dispatchEventsForAggregate(new UniqueEntityID())

      expect(handler).not.toHaveBeenCalled()
    })

    it('should only dispatch handlers matching the event type', async () => {
      const createdHandler = vi.fn()
      const shippedHandler = vi.fn()
      DomainEvents.register(createdHandler, OrderCreatedEvent.name)
      DomainEvents.register(shippedHandler, OrderShippedEvent.name)

      const order = Order.create()
      DomainEvents.markAggregateForDispatch(order)
      await DomainEvents.dispatchEventsForAggregate(order.id)

      expect(createdHandler).toHaveBeenCalledOnce()
      expect(shippedHandler).not.toHaveBeenCalled()
    })
  })

  describe('clearHandlers()', () => {
    it('should remove all registered handlers', async () => {
      const handler = vi.fn()
      DomainEvents.register(handler, OrderCreatedEvent.name)
      DomainEvents.clearHandlers()

      const order = Order.create()
      DomainEvents.markAggregateForDispatch(order)
      await DomainEvents.dispatchEventsForAggregate(order.id)

      expect(handler).not.toHaveBeenCalled()
    })
  })
})
