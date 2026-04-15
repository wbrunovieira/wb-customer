import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITimeEntryRepository } from '../repositories/i-time-entry.repository'
import { ITaskRepository } from '../repositories/i-task.repository'

export interface StopTimeTrackingRequest {
  taskId: string
  userId: string
}

export type StopTimeTrackingResult = Either<never, { durationSecs: number | null }>

@Injectable()
export class StopTimeTrackingUseCase {
  constructor(
    private readonly timeEntryRepo: ITimeEntryRepository,
    private readonly taskRepo: ITaskRepository,
  ) {}

  async execute(req: StopTimeTrackingRequest): Promise<StopTimeTrackingResult> {
    const entry = await this.timeEntryRepo.findActiveByTaskAndUser(req.taskId, req.userId)
    if (!entry) return right({ durationSecs: null })

    entry.stop()
    await this.timeEntryRepo.save(entry)

    if (entry.durationSecs) {
      const task = await this.taskRepo.findById(req.taskId)
      if (task) {
        task.addTrackedTime(entry.durationSecs)
        await this.taskRepo.save(task)
      }
    }

    return right({ durationSecs: entry.durationSecs })
  }
}
