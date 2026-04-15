import { CustomerStub } from './factories'

export class InMemoryCustomerRepository {
  public items: CustomerStub[] = []

  async findById(id: string): Promise<CustomerStub | null> {
    return this.items.find((c) => c.id.value === id) ?? null
  }

  async save(customer: CustomerStub): Promise<void> {
    const idx = this.items.findIndex((c) => c.id.value === customer.id.value)
    if (idx >= 0) {
      this.items[idx] = customer
    } else {
      this.items.push(customer)
    }
  }
}
