import { describe, it, expect, beforeEach } from 'vitest'
import { AssignEmployeeUseCase } from './assign-employee.use-case'
import { InMemoryCustomerRepository } from '@/test/repositories/customers/in-memory-customer.repository'
import { InMemoryCustomerActivityRepository } from '@/test/repositories/customers/in-memory-customer-activity.repository'
import { Customer } from '../../enterprise/entities/customer'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'

let customerRepo: InMemoryCustomerRepository
let activityRepo: InMemoryCustomerActivityRepository
let sut: AssignEmployeeUseCase

beforeEach(() => {
  customerRepo = new InMemoryCustomerRepository()
  activityRepo = new InMemoryCustomerActivityRepository()
  sut = new AssignEmployeeUseCase(customerRepo, activityRepo)
})

describe('AssignEmployeeUseCase', () => {
  it('should assign an employee successfully', async () => {
    const customer = Customer.create({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })
    await customerRepo.save(customer)

    const result = await sut.execute({
      customerId: customer.id.value,
      userId: 'employee-1',
      assignedBy: 'user-1',
    })

    expect(result.isRight()).toBe(true)
    const employees = await customerRepo.findEmployees(customer.id.value)
    expect(employees).toHaveLength(1)
    expect(activityRepo.items[0].type).toBe('assigned')
  })

  it('should be idempotent — skip if already assigned', async () => {
    const customer = Customer.create({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })
    await customerRepo.save(customer)

    await sut.execute({ customerId: customer.id.value, userId: 'employee-1', assignedBy: 'user-1' })
    await sut.execute({ customerId: customer.id.value, userId: 'employee-1', assignedBy: 'user-1' })

    const employees = await customerRepo.findEmployees(customer.id.value)
    expect(employees).toHaveLength(1)
  })

  it('should return CustomerNotFoundError for unknown customer', async () => {
    const result = await sut.execute({
      customerId: 'non-existent',
      userId: 'employee-1',
      assignedBy: 'user-1',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerNotFoundError)
    }
  })
})
