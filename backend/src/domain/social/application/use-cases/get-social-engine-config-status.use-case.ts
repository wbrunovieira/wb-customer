import { Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { Either, right } from '@/core/either'
import { ISocialEngineConfigRepository } from '../repositories/i-social-engine-config.repository'
import { ISocialEngineGateway } from '../gateways/i-social-engine.gateway'

export interface SocialEngineConfigStatus {
  /** Estado efetivo: considera o fallback de .env, não só o banco. */
  configured: boolean
  /** Se veio do banco (cadastrável pela API) ou não. */
  storedInDatabase: boolean
  apiUrl: string | null
  /**
   * sha256 dos 8 primeiros hex da chave. Serve para conferir QUAL chave está
   * carregada sem revelar nenhuma — dois cadastros iguais dão a mesma digital.
   */
  keyFingerprint: string | null
  updatedAt: Date | null
}

export type GetSocialEngineConfigStatusResult = Either<
  never,
  SocialEngineConfigStatus
>

@Injectable()
export class GetSocialEngineConfigStatusUseCase {
  constructor(
    private readonly repo: ISocialEngineConfigRepository,
    private readonly engine: ISocialEngineGateway,
  ) {}

  async execute(): Promise<GetSocialEngineConfigStatusResult> {
    const record = await this.repo.find()
    const configured = await this.engine.isConfigured()

    return right({
      configured,
      storedInDatabase: record !== null,
      apiUrl: record?.apiUrl ?? null,
      keyFingerprint: record ? fingerprint(record.apiKey) : null,
      updatedAt: record?.updatedAt ?? null,
    })
  }
}

function fingerprint(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 8)
}
