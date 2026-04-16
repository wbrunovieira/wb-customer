import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMetaConfigRepository } from '../repositories/i-meta-config.repository'
import { MetaConfig } from '../../enterprise/entities/meta-config'

export interface GetMetaConfigResponse {
  config: MetaConfig
}

export type GetMetaConfigResult = Either<Error, GetMetaConfigResponse>

@Injectable()
export class GetMetaConfigUseCase {
  constructor(private readonly metaConfigRepo: IMetaConfigRepository) {}

  async execute(): Promise<GetMetaConfigResult> {
    const config = await this.metaConfigRepo.find()
    if (!config) {
      return left(new Error('Meta config not found'))
    }
    return right({ config })
  }
}
