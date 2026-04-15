import { TimeEntry as PrismaTimeEntry } from '@prisma/client'
import { TimeEntry } from '@/domain/tasks/enterprise/entities/time-entry'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class TimeEntryMapper {
  static toDomain(raw: PrismaTimeEntry): TimeEntry {
    return TimeEntry.restore(
      {
        taskId: raw.taskId,
        userId: raw.userId,
        startedAt: raw.startedAt,
        stoppedAt: raw.stoppedAt,
        durationSecs: raw.durationSecs,
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(entry: TimeEntry) {
    return {
      id: entry.id.value,
      taskId: entry.taskId,
      userId: entry.userId,
      startedAt: entry.startedAt,
      stoppedAt: entry.stoppedAt,
      durationSecs: entry.durationSecs,
      createdAt: entry.createdAt,
    }
  }
}
