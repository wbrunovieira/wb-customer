import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IDocumentRepository, PaginatedDocuments } from '../repositories/i-document.repository'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'

export interface ListCustomerDocumentsRequest {
  customerId: string
  type?: string
  status?: string
  page?: number
  limit?: number
}

export type ListCustomerDocumentsResult = Either<CustomerNotFoundError, PaginatedDocuments>

@Injectable()
export class ListCustomerDocumentsUseCase {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(request: ListCustomerDocumentsRequest): Promise<ListCustomerDocumentsResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) {
      return left(new CustomerNotFoundError(request.customerId))
    }

    const result = await this.documentRepo.findByCustomerId(request.customerId, {
      type: request.type,
      status: request.status,
      page: request.page,
      limit: request.limit,
    })

    return right(result)
  }
}
