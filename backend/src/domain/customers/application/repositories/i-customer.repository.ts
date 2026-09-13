import { Customer } from '../../enterprise/entities/customer'

export interface FindManyCustomersParams {
  status?: string
  search?: string
  employeeId?: string
  categoryId?: string
  page?: number
  limit?: number
}

export interface PaginatedCustomers {
  items: Customer[]
  total: number
}

export interface CustomerEmployee {
  userId: string
  assignedAt: Date
  assignedBy: string
}

export abstract class ICustomerRepository {
  abstract findById(id: string): Promise<Customer | null>
  abstract findByEmail(email: string): Promise<Customer | null>
  abstract findMany(params: FindManyCustomersParams): Promise<PaginatedCustomers>
  /** Quem já usa este grupo do Postiz, para não ligar o mesmo grupo a dois clientes. */
  abstract findByPostizGroupId(groupId: string): Promise<Customer | null>
  abstract save(customer: Customer): Promise<void>
  abstract assignEmployee(
    customerId: string,
    userId: string,
    assignedBy: string,
  ): Promise<void>
  abstract removeEmployee(customerId: string, userId: string): Promise<void>
  abstract findEmployees(customerId: string): Promise<CustomerEmployee[]>
  abstract isEmployeeAssigned(
    customerId: string,
    userId: string,
  ): Promise<boolean>
}
