import { Injectable } from '@nestjs/common'
import { IUserIdentityRepository } from '@/domain/auth/application/repositories/i-user-identity.repository'
import { UserIdentity } from '@/domain/auth/enterprise/entities/user-identity'
import { Email } from '@/domain/auth/enterprise/value-objects/email.vo'
import { PrismaService } from '../../prisma.service'
import { UserIdentityMapper } from '../../mappers/auth/user-identity.mapper'

@Injectable()
export class PrismaUserIdentityRepository implements IUserIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserIdentity | null> {
    const raw = await this.prisma.userIdentity.findUnique({ where: { id } })
    if (!raw) return null
    return UserIdentityMapper.toDomain(raw)
  }

  async findByEmail(email: Email): Promise<UserIdentity | null> {
    const raw = await this.prisma.userIdentity.findUnique({
      where: { email: email.value },
    })
    if (!raw) return null
    return UserIdentityMapper.toDomain(raw)
  }

  async findAll(): Promise<UserIdentity[]> {
    const raws = await this.prisma.userIdentity.findMany({
      where: { deletedAt: null },
    })
    return raws.map(UserIdentityMapper.toDomain)
  }

  async save(userIdentity: UserIdentity): Promise<void> {
    const data = UserIdentityMapper.toPrisma(userIdentity)
    await this.prisma.userIdentity.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }
}
