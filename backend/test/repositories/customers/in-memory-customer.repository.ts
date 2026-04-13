import {
  ICustomerRepository,
  FindManyCustomersParams,
  PaginatedCustomers,
  CustomerEmployee,
} from '@/domain/customers/application/repositories/i-customer.repository'
import { Customer } from '@/domain/customers/enterprise/entities/customer'

interface StoredEmployee {
  customerId: string
  userId: string
  assignedAt: Date
  assignedBy: string
}

export class InMemoryCustomerRepository implements ICustomerRepository {
  public items: Customer[] = []
  public employeeAssignments: StoredEmployee[] = []

  async findById(id: string): Promise<Customer | null> {
    return this.items.find((c) => c.id.value === id && !c.isDeleted) ?? null
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return (
      this.items.find(
        (c) => c.email.toLowerCase() === email.toLowerCase() && !c.isDeleted,
      ) ?? null
    )
  }

  async findMany(params: FindManyCustomersParams): Promise<PaginatedCustomers> {
    let filtered = this.items.filter((c) => !c.isDeleted)

    if (params.status) {
      filtered = filtered.filter((c) => c.status.value === params.status)
    }

    if (params.categoryId) {
      filtered = filtered.filter((c) => c.categoryId === params.categoryId)
    }

    if (params.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q),
      )
    }

    if (params.employeeId) {
      const assignedCustomerIds = this.employeeAssignments
        .filter((a) => a.userId === params.employeeId)
        .map((a) => a.customerId)
      filtered = filtered.filter((c) =>
        assignedCustomerIds.includes(c.id.value),
      )
    }

    const total = filtered.length
    const page = params.page ?? 1
    const limit = params.limit ?? 20
    const items = filtered.slice((page - 1) * limit, page * limit)

    return { items, total }
  }

  async save(customer: Customer): Promise<void> {
    const index = this.items.findIndex((c) => c.id.equals(customer.id))
    if (index >= 0) {
      this.items[index] = customer
    } else {
      this.items.push(customer)
    }
  }

  async assignEmployee(
    customerId: string,
    userId: string,
    assignedBy: string,
  ): Promise<void> {
    this.employeeAssignments.push({
      customerId,
      userId,
      assignedAt: new Date(),
      assignedBy,
    })
  }

  async removeEmployee(customerId: string, userId: string): Promise<void> {
    this.employeeAssignments = this.employeeAssignments.filter(
      (a) => !(a.customerId === customerId && a.userId === userId),
    )
  }

  async findEmployees(customerId: string): Promise<CustomerEmployee[]> {
    return this.employeeAssignments
      .filter((a) => a.customerId === customerId)
      .map((a) => ({
        userId: a.userId,
        assignedAt: a.assignedAt,
        assignedBy: a.assignedBy,
      }))
  }

  async isEmployeeAssigned(
    customerId: string,
    userId: string,
  ): Promise<boolean> {
    return this.employeeAssignments.some(
      (a) => a.customerId === customerId && a.userId === userId,
    )
  }
}
