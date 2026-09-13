import {
  ISocialEngineGateway,
  PublishInput,
  PublishedTarget,
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
}
