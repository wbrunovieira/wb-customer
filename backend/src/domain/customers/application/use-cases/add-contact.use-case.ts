import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '../repositories/i-customer.repository'
import { IContactRepository } from '../repositories/i-contact.repository'
import { ICustomerActivityRepository } from '../repositories/i-customer-activity.repository'
import { Contact } from '../../enterprise/entities/contact'
import { CustomerActivity } from '../../enterprise/entities/customer-activity'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'

export interface AddContactRequest {
  customerId: string
  addedByUserId: string
  name: string
  email?: string
  phone?: string
  role?: string
  isPrimary?: boolean
}

export interface AddContactResponse {
  contactId: string
}

export type AddContactResult = Either<CustomerNotFoundError, AddContactResponse>

@Injectable()
export class AddContactUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly contactRepo: IContactRepository,
    private readonly activityRepo: ICustomerActivityRepository,
  ) {}

  async execute(request: AddContactRequest): Promise<AddContactResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) {
      return left(new CustomerNotFoundError(request.customerId))
    }

    const contact = Contact.create({
      customerId: request.customerId,
      name: request.name,
      email: request.email,
      phone: request.phone,
      role: request.role,
      isPrimary: request.isPrimary ?? false,
    })

    await this.contactRepo.save(contact)

    await this.activityRepo.save(
      CustomerActivity.create({
        customerId: request.customerId,
        userId: request.addedByUserId,
        type: 'contact_added',
        description: `Contact "${request.name}" added`,
      }),
    )

    return right({ contactId: contact.id.value })
  }
}
