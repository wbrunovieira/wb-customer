import { Injectable } from '@nestjs/common'
import { IRefreshTokenRepository } from '@/domain/auth/application/repositories/i-refresh-token.repository'
import { RefreshToken } from '@/domain/auth/enterprise/entities/refresh-token'
import { PrismaService } from '../../prisma.service'
import { RefreshTokenMapper } from '../../mappers/auth/refresh-token.mapper'

@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByToken(token: string): Promise<RefreshToken | null> {
    const raw = await this.prisma.refreshToken.findUnique({ where: { token } })
    if (!raw) return null
    return RefreshTokenMapper.toDomain(raw)
  }

  async save(refreshToken: RefreshToken): Promise<void> {
    const data = RefreshTokenMapper.toPrisma(refreshToken)
    await this.prisma.refreshToken.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
