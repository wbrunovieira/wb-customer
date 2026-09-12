/**
 * Porta de leitura do painel de atribuição.
 *
 * Separada de ISocialAttributionLinkRepository porque a pergunta é outra: lá se
 * cria e resolve vínculo, aqui se lê conversa atribuída. E separada de
 * IActivityRepository porque a consulta é do domínio social — empurrar junção de
 * atribuição para o repositório de atividades misturaria as duas coisas.
 */

export interface AttributedConversationRow {
  activityId: string
  customerId: string
  /** Quando a conversa começou. */
  occurredAt: Date
  linkId: string
  source: string
  postRef: string | null
  code: string
}

export abstract class ISocialAttributionReportRepository {
  abstract findAttributedConversations(
    customerId: string,
    since: Date,
  ): Promise<AttributedConversationRow[]>
}
