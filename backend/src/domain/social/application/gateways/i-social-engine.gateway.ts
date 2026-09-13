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

export interface PublishInput {
  /** Canais de destino. Vários numa chamada só cobrem o espelho entre redes. */
  channelIds: string[]
  content: string
  /** 'now' publica já; 'schedule' guarda para a data. */
  mode: 'now' | 'schedule'
  /** O motor exige data mesmo em 'now'. */
  date: Date
}

export interface PublishedTarget {
  channelId: string
  /** Id do post no motor. É por aqui que a métrica reencontra este post. */
  postId: string
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

  /**
   * Entrega ao motor o que já foi decidido e conferido aqui. Devolve um id de
   * post por canal — o motor cria um post por rede, não um post compartilhado.
   */
  abstract publish(input: PublishInput): Promise<PublishedTarget[]>
}
