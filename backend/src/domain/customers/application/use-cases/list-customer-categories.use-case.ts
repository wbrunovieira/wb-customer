import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ICustomerCategoryRepository } from '../repositories/i-customer-category.repository'
import { CustomerCategory } from '../../enterprise/entities/customer-category'

export interface ListCustomerCategoriesRequest {
  onlyActive?: boolean
}

export interface ListCustomerCategoriesResponse {
  categories: CustomerCategory[]
}

export type ListCustomerCategoriesResult = Either<
  never,
  ListCustomerCategoriesResponse
>

@Injectable()
export class ListCustomerCategoriesUseCase {
  constructor(
    private readonly categoryRepo: ICustomerCategoryRepository,
  ) {}

  async execute(
    request: ListCustomerCategoriesRequest = {},
  ): Promise<ListCustomerCategoriesResult> {
    const categories = await this.categoryRepo.findAll(request.onlyActive)
    return right({ categories })
  }
}
