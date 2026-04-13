import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '../repositories/i-customer.repository'
import { IContactRepository } from '../repositories/i-contact.repository'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'
import { ContactNotFoundError } from '../../domain/exceptions/contact-not-found.error'

export interface DeleteContactRequest {
  customerId: string
  contactId: string
}

export type DeleteContactResult = Either<
  CustomerNotFoundError | ContactNotFoundError,
  void
>

@Injectable()
export class DeleteContactUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly contactRepo: IContactRepository,
  ) {}

  async execute(request: DeleteContactRequest): Promise<DeleteContactResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) {
      return left(new CustomerNotFoundError(request.customerId))
    }

    const contact = await this.contactRepo.findById(request.contactId)
    if (!contact || contact.customerId !== request.customerId) {
      return left(new ContactNotFoundError(request.contactId))
    }

    await this.contactRepo.delete(request.contactId)

    return right(undefined)
  }
}
