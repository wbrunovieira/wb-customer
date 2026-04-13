import { describe, it, expect } from 'vitest'
import { Entity } from './entity'
import { UniqueEntityID } from './unique-entity-id'

interface StubProps {
  name: string
}

class StubEntity extends Entity<StubProps> {
  static create(props: StubProps, id?: UniqueEntityID): StubEntity {
    return new StubEntity(props, id)
  }

  get name(): string {
    return this.props.name
  }
}

describe('Entity', () => {
  it('should auto-generate an id when none is provided', () => {
    const entity = StubEntity.create({ name: 'Test' })
    expect(entity.id).toBeInstanceOf(UniqueEntityID)
    expect(entity.id.value).toBeDefined()
  })

  it('should use the provided id', () => {
    const id = new UniqueEntityID('fixed-id')
    const entity = StubEntity.create({ name: 'Test' }, id)
    expect(entity.id.value).toBe('fixed-id')
  })

  it('should expose props correctly', () => {
    const entity = StubEntity.create({ name: 'Bruno' })
    expect(entity.name).toBe('Bruno')
  })

  it('should be equal to another entity with the same id', () => {
    const id = new UniqueEntityID('same-id')
    const entity1 = StubEntity.create({ name: 'A' }, id)
    const entity2 = StubEntity.create({ name: 'B' }, id)
    expect(entity1.equals(entity2)).toBe(true)
  })

  it('should not be equal to an entity with a different id', () => {
    const entity1 = StubEntity.create({ name: 'A' })
    const entity2 = StubEntity.create({ name: 'A' })
    expect(entity1.equals(entity2)).toBe(false)
  })

  it('should be equal to itself', () => {
    const entity = StubEntity.create({ name: 'Test' })
    expect(entity.equals(entity)).toBe(true)
  })

  it('should return false when comparing with null', () => {
    const entity = StubEntity.create({ name: 'Test' })
    expect(entity.equals(null)).toBe(false)
  })

  it('should return false when comparing with undefined', () => {
    const entity = StubEntity.create({ name: 'Test' })
    expect(entity.equals(undefined)).toBe(false)
  })
})
