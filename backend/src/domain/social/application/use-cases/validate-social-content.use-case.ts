import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ContentRule, RuleViolation, houseRules } from '../services/content-rules'

export interface ValidateSocialContentRequest {
  content: string
}

export interface ValidateSocialContentResponse {
  /** false quando há ao menos uma violação de bloqueio. Alertas não reprovam. */
  ok: boolean
  violations: RuleViolation[]
}

export type ValidateSocialContentResult = Either<never, ValidateSocialContentResponse>

/**
 * Aplica as regras editoriais da casa a um texto.
 *
 * Síncrono e sem dependência de banco de propósito: isto precisa rodar no
 * caminho do salvamento sem custo, e também sozinho, como rota que um agente
 * chama antes de escrever em qualquer lugar — inclusive enquanto as publicações
 * ainda são feitas à mão no Business Suite.
 *
 * Nunca retorna left: texto ruim não é erro de execução, é resultado com
 * violações. Quem chama decide se barra ou só mostra.
 */
@Injectable()
export class ValidateSocialContentUseCase {
  /**
   * Costura para externalizar as regras depois: hoje vem da lista em código,
   * amanhã de uma tabela — muda só a origem desta atribuição.
   *
   * Campo e não parâmetro de construtor: o Nest tenta injetar todo parâmetro, e
   * `ContentRule[]` vira `Array` em runtime, sem token. Mesmo com valor padrão
   * o boot quebra com "can't resolve dependencies ... argument Array at index [0]".
   */
  private readonly rules: ContentRule[] = houseRules

  execute(req: ValidateSocialContentRequest): ValidateSocialContentResult {
    const content = req.content ?? ''

    const violations = this.rules
      .flatMap((rule) => rule.run(content))
      .sort((a, b) => a.index - b.index)

    return right({
      ok: !violations.some((v) => v.severity === 'block'),
      violations,
    })
  }
}
