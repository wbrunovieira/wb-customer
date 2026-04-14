import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskRepository } from '../repositories/i-task.repository'
import { ITaskActivityLogRepository } from '../repositories/i-task-activity-log.repository'
import { TaskNotFoundError } from '../../domain/exceptions/task-not-found.error'
import { TaskActivityLog } from '../../enterprise/entities/task-activity-log'

export type UpdateTaskResult = Either<TaskNotFoundError, { taskId: string }>

@Injectable()
export class UpdateTaskUseCase {
  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly logRepo: ITaskActivityLogRepository,
  ) {}

  async execute(req: {
    taskId: string
    customerId: string
    userId: string
    title?: string
    description?: string
    sprintId?: string | null
    assigneeUserId?: string | null
    startAt?: Date | null
    endAt?: Date | null
    estimatedHours?: number | null
    impact?: number | null
    confidence?: number | null
    effort?: number | null
  }): Promise<UpdateTaskResult> {
    const task = await this.taskRepo.findById(req.taskId)
    if (!task || task.customerId !== req.customerId) return left(new TaskNotFoundError(req.taskId))

    task.update({
      title: req.title,
      description: req.description,
      sprintId: req.sprintId,
      assigneeUserId: req.assigneeUserId,
      startAt: req.startAt,
      endAt: req.endAt,
      estimatedHours: req.estimatedHours,
      impact: req.impact,
      confidence: req.confidence,
      effort: req.effort,
    })
    await this.taskRepo.save(task)
    await this.logRepo.save(TaskActivityLog.create({
      taskId: task.id.value, userId: req.userId, action: 'updated', fromValue: null, toValue: null,
    }))
    return right({ taskId: task.id.value })
  }
}
