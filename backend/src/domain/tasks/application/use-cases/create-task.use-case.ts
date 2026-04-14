import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITaskRepository } from '../repositories/i-task.repository'
import { ITaskActivityLogRepository } from '../repositories/i-task-activity-log.repository'
import { Task } from '../../enterprise/entities/task'
import { TaskStatus } from '../../enterprise/value-objects/task-status.vo'
import { RecurrenceType } from '../../enterprise/value-objects/recurrence-type.vo'
import { TaskActivityLog } from '../../enterprise/entities/task-activity-log'

export interface CreateTaskRequest {
  customerId: string
  sprintId?: string
  parentTaskId?: string
  title: string
  description?: string
  status?: string
  ownerUserId: string
  assigneeUserId?: string
  startAt?: Date
  endAt?: Date
  estimatedHours?: number
  impact?: number
  confidence?: number
  effort?: number
}

export interface CreateTaskResponse { taskId: string }
export type CreateTaskResult = Either<never, CreateTaskResponse>

@Injectable()
export class CreateTaskUseCase {
  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly activityLogRepo: ITaskActivityLogRepository,
  ) {}

  async execute(req: CreateTaskRequest): Promise<CreateTaskResult> {
    const task = Task.create({
      customerId: req.customerId,
      sprintId: req.sprintId,
      parentTaskId: req.parentTaskId,
      title: req.title,
      description: req.description,
      status: TaskStatus.createUnsafe(req.status ?? 'backlog'),
      ownerUserId: req.ownerUserId,
      assigneeUserId: req.assigneeUserId,
      startAt: req.startAt,
      endAt: req.endAt,
      estimatedHours: req.estimatedHours,
      impact: req.impact,
      confidence: req.confidence,
      effort: req.effort,
      recurrenceType: RecurrenceType.createUnsafe('none'),
    })
    await this.taskRepo.save(task)
    await this.activityLogRepo.save(
      TaskActivityLog.create({
        taskId: task.id.value,
        userId: req.ownerUserId,
        action: 'created',
        fromValue: null,
        toValue: task.status.value,
      }),
    )
    return right({ taskId: task.id.value })
  }
}
