import { describe, it, expect } from 'vitest'
import { AggregateRoot } from './aggregate-root'
import { UniqueEntityID } from './unique-entity-id'
import { DomainEvent } from './domain/domain-event'

interface StubProps {
  value: string
}

class StubDomainEvent implements DomainEvent {
  occurredAt: Date = new Date()

  constructor(private readonly aggregateId: string) {}

  getAggregateId(): string {
    return this.aggregateId
  }
}

class StubAggregate extends AggregateRoot<StubProps> {
  static create(props: StubProps, id?: UniqueEntityID): StubAggregate {
    return new StubAggregate(props, id)
  }

  doSomething(): void {
    this.addDomainEvent(new StubDomainEvent(this.id.value))
  }
}

describe('AggregateRoot', () => {
  it('should start with no domain events', () => {
    const aggregate = StubAggregate.create({ value: 'test' })
    expect(aggregate.domainEvents).toHaveLength(0)
  })

  it('should add a domain event', () => {
    const aggregate = StubAggregate.create({ value: 'test' })
    aggregate.doSomething()
    expect(aggregate.domainEvents).toHaveLength(1)
  })

  it('should accumulate multiple domain events', () => {
    const aggregate = StubAggregate.create({ value: 'test' })
    aggregate.doSomething()
    aggregate.doSomething()
    expect(aggregate.domainEvents).toHaveLength(2)
  })

  it('should clear all domain events', () => {
    const aggregate = StubAggregate.create({ value: 'test' })
    aggregate.doSomething()
    aggregate.doSomething()
    aggregate.clearEvents()
    expect(aggregate.domainEvents).toHaveLength(0)
  })

  it('should expose the event with correct aggregate id', () => {
    const id = new UniqueEntityID('agg-id')
    const aggregate = StubAggregate.create({ value: 'test' }, id)
    aggregate.doSomething()
    expect(aggregate.domainEvents[0].getAggregateId()).toBe('agg-id')
  })

  it('should have the DomainEvent occurredAt set', () => {
    const before = new Date()
    const aggregate = StubAggregate.create({ value: 'test' })
    aggregate.doSomething()
    const after = new Date()
    const event = aggregate.domainEvents[0]
    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})
