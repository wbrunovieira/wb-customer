import { Injectable } from '@nestjs/common'
import { IUserAuthorizationRepository } from '@/domain/auth/application/repositories/i-user-authorization.repository'
import { UserAuthorization } from '@/domain/auth/enterprise/entities/user-authorization'
import { PrismaService } from '../../prisma.service'
import { UserAuthorizationMapper } from '../../mappers/auth/user-authorization.mapper'

@Injectable()
export class PrismaUserAuthorizationRepository implements IUserAuthorizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserAuthorization | null> {
    const raw = await this.prisma.userAuthorization.findUnique({ where: { userId } })
    if (!raw) return null
    return UserAuthorizationMapper.toDomain(raw)
  }

  async save(userAuthorization: UserAuthorization): Promise<void> {
    const data = UserAuthorizationMapper.toPrisma(userAuthorization)
    await this.prisma.userAuthorization.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }
}
