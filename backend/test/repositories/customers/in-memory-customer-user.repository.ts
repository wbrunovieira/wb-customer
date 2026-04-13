import { ICustomerUserRepository } from '@/domain/customers/application/repositories/i-customer-user.repository'
import { CustomerUser } from '@/domain/customers/enterprise/entities/customer-user'

export class InMemoryCustomerUserRepository implements ICustomerUserRepository {
  public items: CustomerUser[] = []

  async findById(id: string): Promise<CustomerUser | null> {
    return this.items.find((cu) => cu.id.value === id) ?? null
  }

  async findByUserId(userId: string): Promise<CustomerUser | null> {
    return this.items.find((cu) => cu.userId === userId) ?? null
  }

  async findByCustomerId(customerId: string): Promise<CustomerUser[]> {
    return this.items.filter((cu) => cu.customerId === customerId)
  }

  async save(customerUser: CustomerUser): Promise<void> {
    const index = this.items.findIndex((cu) => cu.id.equals(customerUser.id))
    if (index >= 0) {
      this.items[index] = customerUser
    } else {
      this.items.push(customerUser)
    }
  }
}
