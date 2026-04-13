import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '../repositories/i-customer.repository'
import { ICustomerActivityRepository } from '../repositories/i-customer-activity.repository'
import { CustomerActivity } from '../../enterprise/entities/customer-activity'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'

export interface RemoveEmployeeRequest {
  customerId: string
  userId: string
  removedBy: string
}

export type RemoveEmployeeResult = Either<CustomerNotFoundError, void>

@Injectable()
export class RemoveEmployeeUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly activityRepo: ICustomerActivityRepository,
  ) {}

  async execute(request: RemoveEmployeeRequest): Promise<RemoveEmployeeResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) {
      return left(new CustomerNotFoundError(request.customerId))
    }

    await this.customerRepo.removeEmployee(request.customerId, request.userId)

    await this.activityRepo.save(
      CustomerActivity.create({
        customerId: request.customerId,
        userId: request.removedBy,
        type: 'updated',
        description: `Employee removed from customer`,
        metadata: { removedUserId: request.userId },
      }),
    )

    return right(undefined)
  }
}
