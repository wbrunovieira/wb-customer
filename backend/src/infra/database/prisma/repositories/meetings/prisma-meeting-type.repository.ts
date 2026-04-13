import { Injectable } from '@nestjs/common'
import { IMeetingTypeRepository } from '@/domain/meetings/application/repositories/i-meeting-type.repository'
import { MeetingType } from '@/domain/meetings/enterprise/entities/meeting-type'
import { PrismaService } from '../../prisma.service'
import { MeetingTypeMapper } from '../../mappers/meetings/meeting-type.mapper'

@Injectable()
export class PrismaMeetingTypeRepository implements IMeetingTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MeetingType | null> {
    const raw = await this.prisma.meetingType.findUnique({ where: { id } })
    return raw ? MeetingTypeMapper.toDomain(raw) : null
  }

  async findByName(name: string): Promise<MeetingType | null> {
    const raw = await this.prisma.meetingType.findUnique({ where: { name } })
    return raw ? MeetingTypeMapper.toDomain(raw) : null
  }

  async findAll(onlyActive = true): Promise<MeetingType[]> {
    const rows = await this.prisma.meetingType.findMany({
      where: {
        deletedAt: null,
        ...(onlyActive ? { isActive: true } : {}),
      },
      orderBy: { name: 'asc' },
    })
    return rows.map(MeetingTypeMapper.toDomain)
  }

  async save(meetingType: MeetingType): Promise<void> {
    const data = MeetingTypeMapper.toPrisma(meetingType)
    await this.prisma.meetingType.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }
}
