import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMeetingRepository, PaginatedMeetings } from '../repositories/i-meeting.repository'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'

export interface ListCustomerMeetingsRequest {
  customerId: string
  status?: string
  meetingTypeId?: string
  page?: number
  limit?: number
}

export type ListCustomerMeetingsResult = Either<CustomerNotFoundError, PaginatedMeetings>

@Injectable()
export class ListCustomerMeetingsUseCase {
  constructor(
    private readonly meetingRepo: IMeetingRepository,
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(request: ListCustomerMeetingsRequest): Promise<ListCustomerMeetingsResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) return left(new CustomerNotFoundError(request.customerId))

    const result = await this.meetingRepo.findByCustomerId(request.customerId, {
      status: request.status,
      meetingTypeId: request.meetingTypeId,
      page: request.page,
      limit: request.limit,
    })
    return right(result)
  }
}
