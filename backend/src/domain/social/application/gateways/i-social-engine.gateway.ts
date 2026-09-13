/**
 * Porta para o motor de publicação (hoje o Postiz, decisão #1879).
 *
 * O domínio não conhece a ferramenta: conhece **grupo** — a conta de um cliente
 * dentro do motor — e **canal** — uma rede social ligada àquele grupo.
 */

export interface SocialGroup {
  id: string
  name: string
}

export interface SocialChannel {
  id: string
  name: string
  /** instagram, facebook, linkedin, tiktok, youtube… */
  provider: string
  /** Canal desligado no motor não publica; a tela precisa mostrar isso. */
  disabled: boolean
  /** Grupo a que o canal pertence; null quando ninguém nomeou o cliente nele. */
  groupId: string | null
}

export abstract class ISocialEngineGateway {
  /**
   * Falso quando o motor não foi configurado. As rotas respondem sem quebrar,
   * dizendo o que falta, em vez de estourar erro de conexão.
   */
  abstract isConfigured(): boolean

  abstract listGroups(): Promise<SocialGroup[]>

  /**
   * Todos os canais da organização, cada um carregando o grupo a que pertence.
   * A filtragem por grupo é feita aqui no domínio de propósito: o filtro por
   * grupo na API do motor não é garantido entre versões, o campo do dono é.
   */
  abstract listChannels(): Promise<SocialChannel[]>
}
