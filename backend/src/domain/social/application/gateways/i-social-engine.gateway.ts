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

/** Mídia já hospedada no motor, pronta para ser referenciada num post. */
export interface UploadedMedia {
  id: string
  /**
   * Caminho devolvido pelo motor. Vai de volta exatamente como veio: ele valida
   * a extensão e, quando RESTRICT_UPLOAD_DOMAINS está ligado, exige que o
   * caminho seja do domínio dele. URL do Drive não passa nem serve.
   */
  path: string
}

export interface UploadMediaInput {
  fileName: string
  mimeType: string
  buffer: Buffer
}

/**
 * Canal de destino com a rede a que pertence.
 *
 * O provedor viaja junto porque o motor valida as configurações do post contra
 * o DTO daquela rede: o Instagram EXIGE post_type, Facebook e LinkedIn não.
 * Mandar um objeto vazio fazia o Instagram recusar o post na validação.
 */
export interface PublishTarget {
  id: string
  provider: string
}

export interface PublishInput {
  /** Canais de destino. Vários numa chamada só cobrem o espelho entre redes. */
  channels: PublishTarget[]
  content: string
  /** 'now' publica já; 'schedule' guarda para a data. */
  mode: 'now' | 'schedule'
  /** O motor exige data mesmo em 'now'. */
  date: Date
  /** Mídia já enviada ao motor, na ordem em que deve aparecer no post. */
  media?: UploadedMedia[]
}

export interface PublishedTarget {
  channelId: string
  /** Id do post no motor. É por aqui que a métrica reencontra este post. */
  postId: string
}

/** Um post na fila do motor, ou já publicado, dentro da janela consultada. */
export interface QueuedPost {
  id: string
  /** Texto já sem marcação: o motor guarda HTML quando o post nasce na tela dele. */
  content: string
  publishAt: Date
  /** QUEUE | PUBLISHED | ERROR | DRAFT, como o motor chama. */
  state: string
  /** Link do post na rede, quando já saiu. */
  url: string | null
  channelId: string
  channelName: string
  provider: string
  /** Agrupa o mesmo post espelhado em várias redes. */
  group: string | null
}

export interface ListQueueInput {
  /** Grupo do cliente; sem ele, a fila da organização inteira. */
  groupId?: string | null
  from: Date
  to: Date
}

/** Uma métrica de um post, como a rede a reporta. */
export interface PostMetric {
  /** Views, Reach, Likes… o rótulo vem do motor, que vem da rede. */
  label: string
  total: number
  percentageChange: number
}

export interface PostMetrics {
  /**
   * Falso quando não há o que mostrar: o post não chegou a publicar, ou a rede
   * não expõe métrica por post. Distinguir isso de "zero" importa — zero é um
   * resultado, ausência é falta de dado.
   */
  available: boolean
  metrics: PostMetric[]
}

export abstract class ISocialEngineGateway {
  /**
   * Falso quando o motor não foi configurado. As rotas respondem sem quebrar,
   * dizendo o que falta, em vez de estourar erro de conexão.
   */
  abstract isConfigured(): Promise<boolean>

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

  /**
   * A fila do motor dentro de uma janela. A janela é obrigatória porque o motor
   * exige começo e fim — sem eles ele recusa o pedido.
   */
  abstract listQueue(input: ListQueueInput): Promise<QueuedPost[]>

  /**
   * Tira o post da fila do motor.
   *
   * Apaga o post em TODAS as redes em que ele foi espelhado, não só numa: o
   * motor resolve o grupo a partir do id e remove o grupo inteiro.
   */
  abstract cancelPost(postId: string): Promise<void>

  /**
   * Métrica de um post já publicado.
   *
   * Uma chamada por post, de propósito: a API pública do motor tem teto de 90
   * requisições por hora, e buscar a métrica de um mês inteiro a cada abertura
   * de tela queimaria o teto sozinha.
   */
  abstract getPostMetrics(postId: string, days: number): Promise<PostMetrics>

  /**
   * Hospeda um arquivo no motor e devolve a referência que o post usa.
   *
   * O post referencia mídia por id do motor; mandar a URL de onde o arquivo
   * mora hoje não funciona, porque ele valida extensão e domínio do caminho.
   */
  abstract uploadMedia(input: UploadMediaInput): Promise<UploadedMedia>
}
