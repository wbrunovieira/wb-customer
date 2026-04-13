import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '../repositories/i-customer.repository'
import { ICustomerActivityRepository } from '../repositories/i-customer-activity.repository'
import { ICustomerCategoryRepository } from '../repositories/i-customer-category.repository'
import { CustomerActivity } from '../../enterprise/entities/customer-activity'
import { CustomerStatus } from '../../enterprise/value-objects/customer-status.vo'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'
import { CustomerAlreadyExistsError } from '../../domain/exceptions/customer-already-exists.error'
import { CustomerCategoryNotFoundError } from '../../domain/exceptions/customer-category-not-found.error'
import { InvalidCustomerStatusError } from '../../domain/exceptions/invalid-customer-status.error'

export interface UpdateCustomerRequest {
  customerId: string
  updatedByUserId: string
  name?: string
  email?: string
  phone?: string | null
  document?: string | null
  website?: string | null
  notes?: string | null
  status?: string
  categoryId?: string | null
}

export interface UpdateCustomerResponse {
  customerId: string
}

export type UpdateCustomerResult = Either<
  | CustomerNotFoundError
  | CustomerAlreadyExistsError
  | CustomerCategoryNotFoundError
  | InvalidCustomerStatusError,
  UpdateCustomerResponse
>

@Injectable()
export class UpdateCustomerUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly activityRepo: ICustomerActivityRepository,
    private readonly categoryRepo: ICustomerCategoryRepository,
  ) {}

  async execute(request: UpdateCustomerRequest): Promise<UpdateCustomerResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) {
      return left(new CustomerNotFoundError(request.customerId))
    }

    if (request.email && request.email !== customer.email) {
      const existing = await this.customerRepo.findByEmail(request.email)
      if (existing) {
        return left(new CustomerAlreadyExistsError(request.email))
      }
    }

    if (request.categoryId !== undefined && request.categoryId !== null) {
      const category = await this.categoryRepo.findById(request.categoryId)
      if (!category) {
        return left(new CustomerCategoryNotFoundError(request.categoryId))
      }
    }

    let status: CustomerStatus | undefined
    if (request.status !== undefined) {
      const statusOrError = CustomerStatus.create(request.status)
      if (statusOrError.isLeft()) return left(statusOrError.value)
      status = statusOrError.value
    }

    customer.update(
      {
        name: request.name,
        email: request.email,
        phone: request.phone,
        document: request.document,
        website: request.website,
        notes: request.notes,
        status,
        categoryId: request.categoryId,
      },
      request.updatedByUserId,
    )

    await this.customerRepo.save(customer)

    await this.activityRepo.save(
      CustomerActivity.create({
        customerId: customer.id.value,
        userId: request.updatedByUserId,
        type: 'updated',
        description: `Customer "${customer.name}" updated`,
      }),
    )

    return right({ customerId: customer.id.value })
  }
}
