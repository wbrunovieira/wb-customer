import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ISocialEngineGateway } from '../gateways/i-social-engine.gateway'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'

export interface TestSocialEngineConfigResponse {
  ok: true
  /** Quantos grupos o motor respondeu — prova que a chave autenticou. */
  groups: number
}

export type TestSocialEngineConfigResult = Either<
  SocialEngineNotConfiguredError | Error,
  TestSocialEngineConfigResponse
>

/**
 * Bate no motor com as credenciais cadastradas e diz se elas funcionam.
 *
 * Existe para quem cadastrou a chave poder confirmá-la sem lê-la de volta — a
 * alternativa seria devolver o segredo, e um segredo que a API devolve é um
 * segredo a mais para vazar.
 *
 * Custa 1 das 90 requisições/hora do motor, então é uma ação explícita e nunca
 * algo chamado no carregamento de tela.
 */
@Injectable()
export class TestSocialEngineConfigUseCase {
  constructor(private readonly engine: ISocialEngineGateway) {}

  async execute(): Promise<TestSocialEngineConfigResult> {
    if (!(await this.engine.isConfigured())) {
      return left(new SocialEngineNotConfiguredError())
    }

    try {
      const groups = await this.engine.listGroups()
      return right({ ok: true, groups: groups.length })
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
