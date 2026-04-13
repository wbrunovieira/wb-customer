import { Contact } from '../../enterprise/entities/contact'

export abstract class IContactRepository {
  abstract findById(id: string): Promise<Contact | null>
  abstract findByCustomerId(customerId: string): Promise<Contact[]>
  abstract save(contact: Contact): Promise<void>
  abstract delete(id: string): Promise<void>
}
