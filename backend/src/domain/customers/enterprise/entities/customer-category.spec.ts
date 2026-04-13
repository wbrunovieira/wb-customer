import { describe, it, expect } from 'vitest'
import { CustomerCategory } from './customer-category'

describe('CustomerCategory', () => {
  it('should create a category with default active state', () => {
    const category = CustomerCategory.create({
      name: 'SaaS',
      description: 'Software as a Service companies',
    })

    expect(category.name).toBe('SaaS')
    expect(category.description).toBe('Software as a Service companies')
    expect(category.isActive).toBe(true)
    expect(category.isDeleted).toBe(false)
  })

  it('should create a category without description', () => {
    const category = CustomerCategory.create({ name: 'Agency' })

    expect(category.description).toBeNull()
  })

  it('should update fields', () => {
    const category = CustomerCategory.create({ name: 'SaaS' })

    category.update({ name: 'SaaS Updated', description: 'Updated desc', isActive: false })

    expect(category.name).toBe('SaaS Updated')
    expect(category.description).toBe('Updated desc')
    expect(category.isActive).toBe(false)
  })

  it('should soft delete', () => {
    const category = CustomerCategory.create({ name: 'SaaS' })

    category.softDelete()

    expect(category.isDeleted).toBe(true)
    expect(category.deletedAt).not.toBeNull()
  })
})
