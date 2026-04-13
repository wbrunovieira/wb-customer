import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '../repositories/i-customer.repository'
import { ICustomerActivityRepository } from '../repositories/i-customer-activity.repository'
import { CustomerActivity } from '../../enterprise/entities/customer-activity'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'

export interface DeleteCustomerRequest {
  customerId: string
  deletedByUserId: string
}

export type DeleteCustomerResult = Either<CustomerNotFoundError, void>

@Injectable()
export class DeleteCustomerUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly activityRepo: ICustomerActivityRepository,
  ) {}

  async execute(request: DeleteCustomerRequest): Promise<DeleteCustomerResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) {
      return left(new CustomerNotFoundError(request.customerId))
    }

    customer.softDelete()
    await this.customerRepo.save(customer)

    await this.activityRepo.save(
      CustomerActivity.create({
        customerId: customer.id.value,
        userId: request.deletedByUserId,
        type: 'updated',
        description: `Customer "${customer.name}" deleted`,
      }),
    )

    return right(undefined)
  }
}
