import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository, CustomerEmployee } from '../repositories/i-customer.repository'
import { IContactRepository } from '../repositories/i-contact.repository'
import { Customer } from '../../enterprise/entities/customer'
import { Contact } from '../../enterprise/entities/contact'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'

export interface GetCustomerRequest {
  customerId: string
}

export interface GetCustomerResponse {
  customer: Customer
  contacts: Contact[]
  employees: CustomerEmployee[]
}

export type GetCustomerResult = Either<CustomerNotFoundError, GetCustomerResponse>

@Injectable()
export class GetCustomerUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly contactRepo: IContactRepository,
  ) {}

  async execute(request: GetCustomerRequest): Promise<GetCustomerResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) {
      return left(new CustomerNotFoundError(request.customerId))
    }

    const [contacts, employees] = await Promise.all([
      this.contactRepo.findByCustomerId(request.customerId),
      this.customerRepo.findEmployees(request.customerId),
    ])

    return right({ customer, contacts, employees })
  }
}
