import { Creative, CreativeType, CreativeStatus } from '../../enterprise/entities/creative'

export interface FindManyCreativesParams {
  type?: CreativeType
  status?: CreativeStatus
  page?: number
  limit?: number
}

export interface PaginatedCreatives {
  items: Creative[]
  total: number
}

export abstract class ICreativeRepository {
  abstract findById(id: string): Promise<Creative | null>
  abstract findByCustomerId(
    customerId: string,
    params?: FindManyCreativesParams,
  ): Promise<PaginatedCreatives>
  abstract save(creative: Creative): Promise<void>
  abstract softDelete(id: string): Promise<void>
}
