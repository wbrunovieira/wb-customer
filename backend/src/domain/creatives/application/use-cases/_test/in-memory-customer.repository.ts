import {
  ICustomerRepository,
  CustomerEmployee,
  FindManyCustomersParams,
  PaginatedCustomers,
} from '@/domain/customers/application/repositories/i-customer.repository'
import { Customer } from '@/domain/customers/enterprise/entities/customer'

export class InMemoryCustomerRepository implements ICustomerRepository {
  public items: Customer[] = []

  async findById(id: string): Promise<Customer | null> {
    return this.items.find((c) => c.id.value === id) ?? null
  }

  async findByEmail(_email: string): Promise<Customer | null> {
    return null
  }

  async findMany(_params: FindManyCustomersParams): Promise<PaginatedCustomers> {
    return { items: [], total: 0 }
  }

  async save(customer: Customer): Promise<void> {
    const idx = this.items.findIndex((c) => c.id.value === customer.id.value)
    if (idx >= 0) {
      this.items[idx] = customer
    } else {
      this.items.push(customer)
    }
  }

  async assignEmployee(_customerId: string, _userId: string, _assignedBy: string): Promise<void> {}
  async removeEmployee(_customerId: string, _userId: string): Promise<void> {}
  async findEmployees(_customerId: string): Promise<CustomerEmployee[]> { return [] }
  async isEmployeeAssigned(_customerId: string, _userId: string): Promise<boolean> { return false }
}
