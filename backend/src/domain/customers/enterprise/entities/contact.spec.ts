import { describe, it, expect } from 'vitest'
import { Contact } from './contact'

describe('Contact', () => {
  it('should create a contact with default non-primary', () => {
    const contact = Contact.create({
      customerId: 'customer-1',
      name: 'John Doe',
      email: 'john@acme.com',
    })

    expect(contact.name).toBe('John Doe')
    expect(contact.customerId).toBe('customer-1')
    expect(contact.isPrimary).toBe(false)
    expect(contact.email).toBe('john@acme.com')
  })

  it('should create a primary contact', () => {
    const contact = Contact.create({
      customerId: 'customer-1',
      name: 'Jane Doe',
      isPrimary: true,
    })

    expect(contact.isPrimary).toBe(true)
  })

  it('should update contact fields', () => {
    const contact = Contact.create({
      customerId: 'customer-1',
      name: 'John Doe',
    })

    contact.update({ name: 'John Updated', role: 'CEO', isPrimary: true })

    expect(contact.name).toBe('John Updated')
    expect(contact.role).toBe('CEO')
    expect(contact.isPrimary).toBe(true)
  })

  it('should return null for optional fields not provided', () => {
    const contact = Contact.create({
      customerId: 'customer-1',
      name: 'John',
    })

    expect(contact.email).toBeNull()
    expect(contact.phone).toBeNull()
    expect(contact.role).toBeNull()
  })
})
