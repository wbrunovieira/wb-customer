import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerCategoryRepository } from '../repositories/i-customer-category.repository'
import { CustomerCategory } from '../../enterprise/entities/customer-category'
import { CustomerCategoryAlreadyExistsError } from '../../domain/exceptions/customer-category-already-exists.error'

export interface CreateCustomerCategoryRequest {
  name: string
  description?: string
}

export interface CreateCustomerCategoryResponse {
  categoryId: string
}

export type CreateCustomerCategoryResult = Either<
  CustomerCategoryAlreadyExistsError,
  CreateCustomerCategoryResponse
>

@Injectable()
export class CreateCustomerCategoryUseCase {
  constructor(
    private readonly categoryRepo: ICustomerCategoryRepository,
  ) {}

  async execute(
    request: CreateCustomerCategoryRequest,
  ): Promise<CreateCustomerCategoryResult> {
    const existing = await this.categoryRepo.findByName(request.name)
    if (existing) {
      return left(new CustomerCategoryAlreadyExistsError(request.name))
    }

    const category = CustomerCategory.create({
      name: request.name,
      description: request.description,
    })

    await this.categoryRepo.save(category)

    return right({ categoryId: category.id.value })
  }
}
