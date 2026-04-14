import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITaskActivityLogRepository } from '../repositories/i-task-activity-log.repository'
import { TaskActivityLog } from '../../enterprise/entities/task-activity-log'

export type GetTaskActivityLogResult = Either<never, { logs: TaskActivityLog[] }>

@Injectable()
export class GetTaskActivityLogUseCase {
  constructor(private readonly logRepo: ITaskActivityLogRepository) {}

  async execute(req: { taskId: string }): Promise<GetTaskActivityLogResult> {
    const logs = await this.logRepo.findByTaskId(req.taskId)
    return right({ logs })
  }
}
