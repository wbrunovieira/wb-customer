import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ISocialEngineConfigRepository } from '../repositories/i-social-engine-config.repository'
import { InvalidSocialEngineConfigError } from '../../domain/exceptions/invalid-social-engine-config.error'

export interface SaveSocialEngineConfigRequest {
  apiUrl: string
  apiKey: string
}

export type SaveSocialEngineConfigResult = Either<
  InvalidSocialEngineConfigError,
  { success: true }
>

@Injectable()
export class SaveSocialEngineConfigUseCase {
  constructor(private readonly repo: ISocialEngineConfigRepository) {}

  async execute(
    req: SaveSocialEngineConfigRequest,
  ): Promise<SaveSocialEngineConfigResult> {
    // Espaço em volta é o erro de colagem mais comum e o mais difícil de ver
    // depois: a chave "certa" com um \n no fim falha na autenticação sem dizer
    // por quê. Cortar aqui, uma vez, evita caçar isso no motor.
    const apiUrl = (req.apiUrl ?? '').trim().replace(/\/+$/, '')
    const apiKey = (req.apiKey ?? '').trim()

    if (!apiUrl) {
      return left(new InvalidSocialEngineConfigError('apiUrl é obrigatório.'))
    }

    let parsed: URL
    try {
      parsed = new URL(apiUrl)
    } catch {
      return left(
        new InvalidSocialEngineConfigError(
          'apiUrl precisa ser uma URL absoluta, com esquema. Ex.: https://postiz.exemplo.com',
        ),
      )
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return left(
        new InvalidSocialEngineConfigError('apiUrl precisa ser http ou https.'),
      )
    }

    if (!apiKey) {
      return left(new InvalidSocialEngineConfigError('apiKey é obrigatório.'))
    }

    // A chave vai num header. Um espaço ou quebra de linha no meio produziria
    // um header inválido, então é erro de entrada, não algo a normalizar.
    if (/\s/.test(apiKey)) {
      return left(
        new InvalidSocialEngineConfigError(
          'apiKey não pode conter espaços ou quebras de linha.',
        ),
      )
    }

    await this.repo.save({ apiUrl, apiKey })
    return right({ success: true })
  }
}
