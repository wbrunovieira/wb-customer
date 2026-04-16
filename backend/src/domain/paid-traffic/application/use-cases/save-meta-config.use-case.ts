import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { IMetaConfigRepository } from '../repositories/i-meta-config.repository'
import { MetaConfig } from '../../enterprise/entities/meta-config'

export interface SaveMetaConfigRequest {
  appId: string
  appSecret: string
  systemUserToken: string
  bmId: string
}

export interface SaveMetaConfigResponse {
  success: true
}

export type SaveMetaConfigResult = Either<Error, SaveMetaConfigResponse>

@Injectable()
export class SaveMetaConfigUseCase {
  constructor(private readonly metaConfigRepo: IMetaConfigRepository) {}

  async execute(req: SaveMetaConfigRequest): Promise<SaveMetaConfigResult> {
    const existing = await this.metaConfigRepo.find()

    if (existing) {
      existing.update({
        appId: req.appId,
        appSecret: req.appSecret,
        systemUserToken: req.systemUserToken,
        bmId: req.bmId,
      })
      await this.metaConfigRepo.save(existing)
    } else {
      const config = MetaConfig.create({
        appId: req.appId,
        appSecret: req.appSecret,
        systemUserToken: req.systemUserToken,
        bmId: req.bmId,
      })
      await this.metaConfigRepo.save(config)
    }

    return right({ success: true })
  }
}
