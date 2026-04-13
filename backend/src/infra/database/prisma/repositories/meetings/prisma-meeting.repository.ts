import { Injectable } from '@nestjs/common'
import {
  IMeetingRepository,
  FindManyMeetingsParams,
  PaginatedMeetings,
} from '@/domain/meetings/application/repositories/i-meeting.repository'
import { Meeting } from '@/domain/meetings/enterprise/entities/meeting'
import { PrismaService } from '../../prisma.service'
import { MeetingMapper } from '../../mappers/meetings/meeting.mapper'
import { Prisma } from '@prisma/client'

@Injectable()
export class PrismaMeetingRepository implements IMeetingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Meeting | null> {
    const raw = await this.prisma.meeting.findUnique({ where: { id } })
    return raw ? MeetingMapper.toDomain(raw) : null
  }

  async findByCustomerId(
    customerId: string,
    params: FindManyMeetingsParams,
  ): Promise<PaginatedMeetings> {
    const page = params.page ?? 1
    const limit = params.limit ?? 20

    const where: Prisma.MeetingWhereInput = {
      customerId,
      ...(params.status ? { status: params.status as Prisma.EnumMeetingStatusFilter } : {}),
      ...(params.meetingTypeId ? { meetingTypeId: params.meetingTypeId } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startAt: 'desc' },
      }),
      this.prisma.meeting.count({ where }),
    ])

    return { items: items.map(MeetingMapper.toDomain), total }
  }

  async findByGoogleEventId(googleEventId: string): Promise<Meeting | null> {
    const raw = await this.prisma.meeting.findUnique({ where: { googleEventId } })
    return raw ? MeetingMapper.toDomain(raw) : null
  }

  async findScheduledBefore(before: Date): Promise<Meeting[]> {
    const rows = await this.prisma.meeting.findMany({
      where: {
        status: 'scheduled',
        endAt: { lte: before },
      },
    })
    return rows.map(MeetingMapper.toDomain)
  }

  async findEndedWithoutRecording(since: Date): Promise<Meeting[]> {
    const rows = await this.prisma.meeting.findMany({
      where: {
        status: 'ended',
        recordingDriveId: null,
        actualEndAt: { gte: since },
      },
    })
    return rows.map(MeetingMapper.toDomain)
  }

  async findWithPendingTranscription(): Promise<Meeting[]> {
    const rows = await this.prisma.meeting.findMany({
      where: { transcriptionJobId: { not: null } },
    })
    return rows.map(MeetingMapper.toDomain)
  }

  async save(meeting: Meeting): Promise<void> {
    const { id, ...data } = MeetingMapper.toPrisma(meeting)
    await this.prisma.meeting.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    })
  }
}
