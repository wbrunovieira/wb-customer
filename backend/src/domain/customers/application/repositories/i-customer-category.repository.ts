import { CustomerCategory } from '../../enterprise/entities/customer-category'

export abstract class ICustomerCategoryRepository {
  abstract findById(id: string): Promise<CustomerCategory | null>
  abstract findByName(name: string): Promise<CustomerCategory | null>
  abstract findAll(onlyActive?: boolean): Promise<CustomerCategory[]>
  abstract save(category: CustomerCategory): Promise<void>
}
