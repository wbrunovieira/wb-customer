import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITimeEntryRepository } from '../repositories/i-time-entry.repository'
import { TimeEntry } from '../../enterprise/entities/time-entry'

export type GetTaskTimeEntriesResult = Either<never, { entries: TimeEntry[]; activeEntryId: string | null }>

@Injectable()
export class GetTaskTimeEntriesUseCase {
  constructor(private readonly timeEntryRepo: ITimeEntryRepository) {}

  async execute(taskId: string, userId: string): Promise<GetTaskTimeEntriesResult> {
    const entries = await this.timeEntryRepo.findByTaskId(taskId)
    const active = entries.find((e) => e.userId === userId && e.isRunning)
    return right({ entries, activeEntryId: active?.id.value ?? null })
  }
}
