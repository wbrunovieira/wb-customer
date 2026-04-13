import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerCategoryRepository } from '../repositories/i-customer-category.repository'
import { CustomerCategoryNotFoundError } from '../../domain/exceptions/customer-category-not-found.error'

export interface DeleteCustomerCategoryRequest {
  categoryId: string
}

export type DeleteCustomerCategoryResult = Either<
  CustomerCategoryNotFoundError,
  void
>

@Injectable()
export class DeleteCustomerCategoryUseCase {
  constructor(
    private readonly categoryRepo: ICustomerCategoryRepository,
  ) {}

  async execute(
    request: DeleteCustomerCategoryRequest,
  ): Promise<DeleteCustomerCategoryResult> {
    const category = await this.categoryRepo.findById(request.categoryId)
    if (!category) {
      return left(new CustomerCategoryNotFoundError(request.categoryId))
    }

    category.softDelete()
    await this.categoryRepo.save(category)

    return right(undefined)
  }
}
