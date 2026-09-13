import {
  ISocialEngineGateway,
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
}
