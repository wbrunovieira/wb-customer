import { describe, it, expect } from 'vitest'
import { UniqueEntityID } from './unique-entity-id'

describe('UniqueEntityID', () => {
  it('should generate a random UUID when no value is provided', () => {
    const id = new UniqueEntityID()
    expect(id.value).toBeDefined()
    expect(typeof id.value).toBe('string')
    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('should use the provided value', () => {
    const id = new UniqueEntityID('custom-id-123')
    expect(id.value).toBe('custom-id-123')
  })

  it('should generate unique IDs on each instantiation', () => {
    const id1 = new UniqueEntityID()
    const id2 = new UniqueEntityID()
    expect(id1.value).not.toBe(id2.value)
  })

  it('should return true when comparing equal IDs', () => {
    const id1 = new UniqueEntityID('same-id')
    const id2 = new UniqueEntityID('same-id')
    expect(id1.equals(id2)).toBe(true)
  })

  it('should return false when comparing different IDs', () => {
    const id1 = new UniqueEntityID('id-one')
    const id2 = new UniqueEntityID('id-two')
    expect(id1.equals(id2)).toBe(false)
  })

  it('should return false when comparing with null', () => {
    const id = new UniqueEntityID()
    expect(id.equals(null)).toBe(false)
  })

  it('should return false when comparing with undefined', () => {
    const id = new UniqueEntityID()
    expect(id.equals(undefined)).toBe(false)
  })

  it('should return the value as string via toString()', () => {
    const id = new UniqueEntityID('my-id')
    expect(id.toString()).toBe('my-id')
  })
})
