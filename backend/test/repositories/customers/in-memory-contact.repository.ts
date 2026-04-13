import { IContactRepository } from '@/domain/customers/application/repositories/i-contact.repository'
import { Contact } from '@/domain/customers/enterprise/entities/contact'

export class InMemoryContactRepository implements IContactRepository {
  public items: Contact[] = []

  async findById(id: string): Promise<Contact | null> {
    return this.items.find((c) => c.id.value === id) ?? null
  }

  async findByCustomerId(customerId: string): Promise<Contact[]> {
    return this.items.filter((c) => c.customerId === customerId)
  }

  async save(contact: Contact): Promise<void> {
    const index = this.items.findIndex((c) => c.id.equals(contact.id))
    if (index >= 0) {
      this.items[index] = contact
    } else {
      this.items.push(contact)
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((c) => c.id.value !== id)
  }
}
