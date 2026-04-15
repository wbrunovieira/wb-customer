import { Injectable } from '@nestjs/common'
import { ITimeEntryRepository } from '@/domain/tasks/application/repositories/i-time-entry.repository'
import { TimeEntry } from '@/domain/tasks/enterprise/entities/time-entry'
import { PrismaService } from '../../prisma.service'
import { TimeEntryMapper } from '../../mappers/tasks/time-entry.mapper'

@Injectable()
export class PrismaTimeEntryRepository implements ITimeEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TimeEntry | null> {
    const raw = await this.prisma.timeEntry.findUnique({ where: { id } })
    return raw ? TimeEntryMapper.toDomain(raw) : null
  }

  async findActiveByTaskAndUser(taskId: string, userId: string): Promise<TimeEntry | null> {
    const raw = await this.prisma.timeEntry.findFirst({
      where: { taskId, userId, stoppedAt: null },
    })
    return raw ? TimeEntryMapper.toDomain(raw) : null
  }

  async findByTaskId(taskId: string): Promise<TimeEntry[]> {
    const rows = await this.prisma.timeEntry.findMany({
      where: { taskId },
      orderBy: { startedAt: 'desc' },
    })
    return rows.map(TimeEntryMapper.toDomain)
  }

  async save(entry: TimeEntry): Promise<void> {
    const { id, ...data } = TimeEntryMapper.toPrisma(entry)
    await this.prisma.timeEntry.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    })
  }
}
