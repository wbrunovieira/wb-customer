import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskRepository } from '../repositories/i-task.repository'
import { ITaskActivityLogRepository } from '../repositories/i-task-activity-log.repository'
import { TaskNotFoundError } from '../../domain/exceptions/task-not-found.error'
import { TaskStatus } from '../../enterprise/value-objects/task-status.vo'
import { TaskActivityLog } from '../../enterprise/entities/task-activity-log'

export type MoveTaskStatusResult = Either<TaskNotFoundError | Error, { taskId: string }>

@Injectable()
export class MoveTaskStatusUseCase {
  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly logRepo: ITaskActivityLogRepository,
  ) {}

  async execute(req: { taskId: string; customerId: string; userId: string; status: string }): Promise<MoveTaskStatusResult> {
    const task = await this.taskRepo.findById(req.taskId)
    if (!task || task.customerId !== req.customerId) return left(new TaskNotFoundError(req.taskId))

    const statusResult = TaskStatus.create(req.status)
    if (statusResult.isLeft()) return left(statusResult.value)

    const from = task.status.value
    task.changeStatus(statusResult.value)
    await this.taskRepo.save(task)
    await this.logRepo.save(TaskActivityLog.create({
      taskId: task.id.value, userId: req.userId, action: 'status_changed', fromValue: from, toValue: req.status,
    }))
    return right({ taskId: task.id.value })
  }
}
