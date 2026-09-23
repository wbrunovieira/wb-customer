import { Injectable } from '@nestjs/common'
import {
  ISocialEngineConfigRepository,
  SocialEngineConfigRecord,
} from '@/domain/social/application/repositories/i-social-engine-config.repository'
import { PrismaService } from '../../prisma.service'

/** Linha única: a instalação fala com um motor, não com vários. */
const SINGLETON_ID = 'social-engine-singleton'

@Injectable()
export class PrismaSocialEngineConfigRepository
  implements ISocialEngineConfigRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async find(): Promise<SocialEngineConfigRecord | null> {
    const raw = await this.prisma.socialEngineConfig.findUnique({
      where: { id: SINGLETON_ID },
    })

    if (!raw) return null

    return {
      apiUrl: raw.apiUrl,
      apiKey: raw.apiKey,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }
  }

  async save(input: { apiUrl: string; apiKey: string }): Promise<void> {
    await this.prisma.socialEngineConfig.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, apiUrl: input.apiUrl, apiKey: input.apiKey },
      update: { apiUrl: input.apiUrl, apiKey: input.apiKey },
    })
  }
}
