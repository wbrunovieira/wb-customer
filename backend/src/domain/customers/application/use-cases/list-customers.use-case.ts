import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import {
  ICustomerRepository,
  PaginatedCustomers,
} from '../repositories/i-customer.repository'

export interface ListCustomersRequest {
  status?: string
  search?: string
  employeeId?: string
  categoryId?: string
  page?: number
  limit?: number
}

export type ListCustomersResult = Either<never, PaginatedCustomers>

@Injectable()
export class ListCustomersUseCase {
  constructor(private readonly customerRepo: ICustomerRepository) {}

  async execute(request: ListCustomersRequest = {}): Promise<ListCustomersResult> {
    const result = await this.customerRepo.findMany({
      status: request.status,
      search: request.search,
      employeeId: request.employeeId,
      categoryId: request.categoryId,
      page: request.page ?? 1,
      limit: request.limit ?? 20,
    })

    return right(result)
  }
}
