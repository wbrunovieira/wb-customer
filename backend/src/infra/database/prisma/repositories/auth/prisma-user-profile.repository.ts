import { Injectable } from '@nestjs/common'
import { IUserProfileRepository } from '@/domain/auth/application/repositories/i-user-profile.repository'
import { UserProfile } from '@/domain/auth/enterprise/entities/user-profile'
import { PrismaService } from '../../prisma.service'
import { UserProfileMapper } from '../../mappers/auth/user-profile.mapper'

@Injectable()
export class PrismaUserProfileRepository implements IUserProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserProfile | null> {
    const raw = await this.prisma.userProfile.findUnique({ where: { userId } })
    if (!raw) return null
    return UserProfileMapper.toDomain(raw)
  }

  async findById(id: string): Promise<UserProfile | null> {
    const raw = await this.prisma.userProfile.findUnique({ where: { id } })
    if (!raw) return null
    return UserProfileMapper.toDomain(raw)
  }

  async save(userProfile: UserProfile): Promise<void> {
    const data = UserProfileMapper.toPrisma(userProfile)
    await this.prisma.userProfile.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }
}
