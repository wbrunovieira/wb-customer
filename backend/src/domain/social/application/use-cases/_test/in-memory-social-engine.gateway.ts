import {
  ISocialEngineGateway,
  ListQueueInput,
  PublishInput,
  PublishedTarget,
  QueuedPost,
  SocialChannel,
  SocialGroup,
} from '../../gateways/i-social-engine.gateway'

export class InMemorySocialEngineGateway implements ISocialEngineGateway {
  public configured = true
  public groups: SocialGroup[] = []
  public channels: SocialChannel[] = []

  isConfigured(): boolean {
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
    return input.channelIds.map((channelId) => ({
      channelId,
      postId: `post-${channelId}`,
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
}
