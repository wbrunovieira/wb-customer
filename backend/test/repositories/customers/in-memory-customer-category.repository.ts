import { ICustomerCategoryRepository } from '@/domain/customers/application/repositories/i-customer-category.repository'
import { CustomerCategory } from '@/domain/customers/enterprise/entities/customer-category'

export class InMemoryCustomerCategoryRepository
  implements ICustomerCategoryRepository
{
  public items: CustomerCategory[] = []

  async findById(id: string): Promise<CustomerCategory | null> {
    return this.items.find((c) => c.id.value === id && !c.isDeleted) ?? null
  }

  async findByName(name: string): Promise<CustomerCategory | null> {
    return (
      this.items.find(
        (c) => c.name.toLowerCase() === name.toLowerCase() && !c.isDeleted,
      ) ?? null
    )
  }

  async findAll(onlyActive?: boolean): Promise<CustomerCategory[]> {
    return this.items.filter(
      (c) => !c.isDeleted && (onlyActive === undefined || c.isActive === onlyActive),
    )
  }

  async save(category: CustomerCategory): Promise<void> {
    const index = this.items.findIndex((c) => c.id.equals(category.id))
    if (index >= 0) {
      this.items[index] = category
    } else {
      this.items.push(category)
    }
  }
}
