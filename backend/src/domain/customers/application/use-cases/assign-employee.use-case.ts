import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '../repositories/i-customer.repository'
import { ICustomerActivityRepository } from '../repositories/i-customer-activity.repository'
import { CustomerActivity } from '../../enterprise/entities/customer-activity'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'

export interface AssignEmployeeRequest {
  customerId: string
  userId: string
  assignedBy: string
}

export type AssignEmployeeResult = Either<CustomerNotFoundError, void>

@Injectable()
export class AssignEmployeeUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly activityRepo: ICustomerActivityRepository,
  ) {}

  async execute(request: AssignEmployeeRequest): Promise<AssignEmployeeResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) {
      return left(new CustomerNotFoundError(request.customerId))
    }

    const alreadyAssigned = await this.customerRepo.isEmployeeAssigned(
      request.customerId,
      request.userId,
    )
    if (alreadyAssigned) {
      return right(undefined)
    }

    customer.recordEmployeeAssigned(request.userId, request.assignedBy)

    await this.customerRepo.assignEmployee(
      request.customerId,
      request.userId,
      request.assignedBy,
    )

    await this.activityRepo.save(
      CustomerActivity.create({
        customerId: request.customerId,
        userId: request.assignedBy,
        type: 'assigned',
        description: `Employee assigned to customer`,
        metadata: { assignedUserId: request.userId },
      }),
    )

    return right(undefined)
  }
}
