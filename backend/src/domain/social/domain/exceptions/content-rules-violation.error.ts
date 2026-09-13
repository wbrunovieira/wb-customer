import { RuleViolation } from '../../application/services/content-rules'

/**
 * O texto feriu uma regra da casa. Carrega as violações porque a tela precisa
 * destacar o trecho — dizer só "texto inválido" obriga a adivinhar o quê.
 */
export class ContentRulesViolationError extends Error {
  constructor(public readonly violations: RuleViolation[]) {
    super('O texto fere as regras editoriais da casa.')
    this.name = 'ContentRulesViolationError'
  }
}
