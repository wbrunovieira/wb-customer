import {
  ISocialEngineGateway,
  ListQueueInput,
  PostMetrics,
  PublishInput,
  UploadMediaInput,
  UploadedMedia,
  PublishedTarget,
  QueuedPost,
  SocialChannel,
  SocialGroup,
} from '../../gateways/i-social-engine.gateway'

export class InMemorySocialEngineGateway implements ISocialEngineGateway {
  public configured = true
  public groups: SocialGroup[] = []
  public channels: SocialChannel[] = []

  async isConfigured(): Promise<boolean> {
    return this.configured
  }

  async listGroups(): Promise<SocialGroup[]> {
    return this.groups
  }

  async listChannels(): Promise<SocialChannel[]> {
    return this.channels
  }

  /** O que foi entregue ao motor, para o teste conferir. */
  public published: PublishInput[] = []
  /** Costura para simular o motor recusando a entrega. */
  public failOnPublish: Error | null = null

  async publish(input: PublishInput): Promise<PublishedTarget[]> {
    if (this.failOnPublish) throw this.failOnPublish

    this.published.push(input)
    return input.channels.map((channel) => ({
      channelId: channel.id,
      postId: `post-${channel.id}`,
    }))
  }

  /** Fila devolvida pelo motor; o teste monta o que quiser ver. */
  public queue: QueuedPost[] = []
  /** O que foi pedido ao motor, para conferir a janela. */
  public queueQueries: ListQueueInput[] = []

  async listQueue(input: ListQueueInput): Promise<QueuedPost[]> {
    this.queueQueries.push(input)
    return this.queue.filter(
      (p) => p.publishAt >= input.from && p.publishAt <= input.to,
    )
  }

  /** Ids removidos da fila, para o teste conferir o que foi cancelado. */
  public canceled: string[] = []

  async cancelPost(postId: string): Promise<void> {
    this.canceled.push(postId)
    this.queue = this.queue.filter((p) => p.id !== postId)
  }

  /** Métrica por id de post; o que não estiver aqui volta como indisponível. */
  public metrics: Record<string, PostMetrics> = {}
  public metricsQueries: { postId: string; days: number }[] = []

  async getPostMetrics(postId: string, days: number): Promise<PostMetrics> {
    this.metricsQueries.push({ postId, days })
    return this.metrics[postId] ?? { available: false, metrics: [] }
  }

  /** Mídias enviadas ao motor, para o teste conferir o que subiu. */
  public uploads: UploadMediaInput[] = []
  /** Costura para simular o motor recusando o arquivo. */
  public failOnUpload: Error | null = null

  async uploadMedia(input: UploadMediaInput): Promise<UploadedMedia> {
    if (this.failOnUpload) throw this.failOnUpload

    this.uploads.push(input)
    const id = `media-${this.uploads.length}`
    return { id, path: `https://motor.example/uploads/${id}.png` }
  }
}
