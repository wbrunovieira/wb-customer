import { CustomerUser } from '../../enterprise/entities/customer-user'

export abstract class ICustomerUserRepository {
  abstract findById(id: string): Promise<CustomerUser | null>
  abstract findByUserId(userId: string): Promise<CustomerUser | null>
  abstract findByCustomerId(customerId: string): Promise<CustomerUser[]>
  abstract save(customerUser: CustomerUser): Promise<void>
}
