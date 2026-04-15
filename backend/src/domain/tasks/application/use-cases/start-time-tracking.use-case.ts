import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITimeEntryRepository } from '../repositories/i-time-entry.repository'
import { ITaskRepository } from '../repositories/i-task.repository'
import { TimeEntry } from '../../enterprise/entities/time-entry'

export interface StartTimeTrackingRequest {
  taskId: string
  userId: string
}

export type StartTimeTrackingResult = Either<never, { entryId: string }>

@Injectable()
export class StartTimeTrackingUseCase {
  constructor(
    private readonly timeEntryRepo: ITimeEntryRepository,
    private readonly taskRepo: ITaskRepository,
  ) {}

  async execute(req: StartTimeTrackingRequest): Promise<StartTimeTrackingResult> {
    // Stop any existing active entry for this user+task
    const active = await this.timeEntryRepo.findActiveByTaskAndUser(req.taskId, req.userId)
    if (active) {
      active.stop()
      await this.timeEntryRepo.save(active)
      if (active.durationSecs) {
        const task = await this.taskRepo.findById(req.taskId)
        if (task) {
          task.addTrackedTime(active.durationSecs)
          await this.taskRepo.save(task)
        }
      }
    }

    const entry = TimeEntry.create({ taskId: req.taskId, userId: req.userId })
    await this.timeEntryRepo.save(entry)
    return right({ entryId: entry.id.value })
  }
}
