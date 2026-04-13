import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerCategoryRepository } from '../repositories/i-customer-category.repository'
import { CustomerCategoryNotFoundError } from '../../domain/exceptions/customer-category-not-found.error'
import { CustomerCategoryAlreadyExistsError } from '../../domain/exceptions/customer-category-already-exists.error'

export interface UpdateCustomerCategoryRequest {
  categoryId: string
  name?: string
  description?: string | null
  isActive?: boolean
}

export interface UpdateCustomerCategoryResponse {
  categoryId: string
}

export type UpdateCustomerCategoryResult = Either<
  CustomerCategoryNotFoundError | CustomerCategoryAlreadyExistsError,
  UpdateCustomerCategoryResponse
>

@Injectable()
export class UpdateCustomerCategoryUseCase {
  constructor(
    private readonly categoryRepo: ICustomerCategoryRepository,
  ) {}

  async execute(
    request: UpdateCustomerCategoryRequest,
  ): Promise<UpdateCustomerCategoryResult> {
    const category = await this.categoryRepo.findById(request.categoryId)
    if (!category) {
      return left(new CustomerCategoryNotFoundError(request.categoryId))
    }

    if (request.name && request.name !== category.name) {
      const existing = await this.categoryRepo.findByName(request.name)
      if (existing) {
        return left(new CustomerCategoryAlreadyExistsError(request.name))
      }
    }

    category.update({
      name: request.name,
      description: request.description,
      isActive: request.isActive,
    })

    await this.categoryRepo.save(category)

    return right({ categoryId: category.id.value })
  }
}
