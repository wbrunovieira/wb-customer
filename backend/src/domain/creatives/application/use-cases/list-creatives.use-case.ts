import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ICreativeRepository } from '../repositories/i-creative.repository'
import { Creative, CreativeType, CreativeStatus } from '../../enterprise/entities/creative'

export interface ListCreativesRequest {
  customerId: string
  type?: string
  status?: string
  page?: number
  limit?: number
}

export interface ListCreativesResponse {
  items: Creative[]
  total: number
}

export type ListCreativesResult = Either<never, ListCreativesResponse>

@Injectable()
export class ListCreativesUseCase {
  constructor(private readonly repo: ICreativeRepository) {}

  async execute(req: ListCreativesRequest): Promise<ListCreativesResult> {
    const { items, total } = await this.repo.findByCustomerId(req.customerId, {
      type: req.type as CreativeType | undefined,
      status: req.status as CreativeStatus | undefined,
      page: req.page,
      limit: req.limit,
    })

    return right({ items, total })
  }
}
