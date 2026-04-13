import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '../repositories/i-customer.repository'
import { IContactRepository } from '../repositories/i-contact.repository'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'
import { ContactNotFoundError } from '../../domain/exceptions/contact-not-found.error'

export interface UpdateContactRequest {
  customerId: string
  contactId: string
  name?: string
  email?: string | null
  phone?: string | null
  role?: string | null
  isPrimary?: boolean
}

export interface UpdateContactResponse {
  contactId: string
}

export type UpdateContactResult = Either<
  CustomerNotFoundError | ContactNotFoundError,
  UpdateContactResponse
>

@Injectable()
export class UpdateContactUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly contactRepo: IContactRepository,
  ) {}

  async execute(request: UpdateContactRequest): Promise<UpdateContactResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) {
      return left(new CustomerNotFoundError(request.customerId))
    }

    const contact = await this.contactRepo.findById(request.contactId)
    if (!contact || contact.customerId !== request.customerId) {
      return left(new ContactNotFoundError(request.contactId))
    }

    contact.update({
      name: request.name,
      email: request.email,
      phone: request.phone,
      role: request.role,
      isPrimary: request.isPrimary,
    })

    await this.contactRepo.save(contact)

    return right({ contactId: contact.id.value })
  }
}
