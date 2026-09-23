import {
  ISocialEngineConfigRepository,
  SocialEngineConfigRecord,
} from '../../repositories/i-social-engine-config.repository'

export class InMemorySocialEngineConfigRepository
  implements ISocialEngineConfigRepository
{
  public record: SocialEngineConfigRecord | null = null

  async find(): Promise<SocialEngineConfigRecord | null> {
    return this.record
  }

  async save(input: { apiUrl: string; apiKey: string }): Promise<void> {
    const agora = new Date()
    this.record = {
      apiUrl: input.apiUrl,
      apiKey: input.apiKey,
      createdAt: this.record?.createdAt ?? agora,
      updatedAt: agora,
    }
  }
}
