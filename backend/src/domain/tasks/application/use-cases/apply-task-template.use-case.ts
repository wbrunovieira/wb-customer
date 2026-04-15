import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskTemplateRepository } from '../repositories/i-task-template.repository'
import { ITaskRepository } from '../repositories/i-task.repository'
import { ITaskActivityLogRepository } from '../repositories/i-task-activity-log.repository'
import { Task } from '../../enterprise/entities/task'
import { TaskStatus } from '../../enterprise/value-objects/task-status.vo'
import { RecurrenceType } from '../../enterprise/value-objects/recurrence-type.vo'
import { TaskActivityLog } from '../../enterprise/entities/task-activity-log'

interface Req {
  templateId: string
  customerId: string
  ownerUserId: string
  sprintId?: string | null
}

class NotFoundError extends Error {}

type Res = Either<NotFoundError, { taskIds: string[] }>

@Injectable()
export class ApplyTaskTemplateUseCase {
  constructor(
    private readonly templateRepo: ITaskTemplateRepository,
    private readonly taskRepo: ITaskRepository,
    private readonly logRepo: ITaskActivityLogRepository,
  ) {}

  async execute(req: Req): Promise<Res> {
    const template = await this.templateRepo.findById(req.templateId)
    if (!template) return left(new NotFoundError('Template não encontrado'))

    const taskIds: string[] = []

    for (let i = 0; i < template.tasks.length; i++) {
      const tData = template.tasks[i]
      const task = Task.create({
        customerId: req.customerId,
        ownerUserId: req.ownerUserId,
        sprintId: req.sprintId ?? null,
        title: tData.title,
        description: tData.description ?? null,
        status: TaskStatus.createUnsafe(tData.status ?? 'backlog'),
        estimatedHours: tData.estimatedHours ?? null,
        impact: tData.impact ?? null,
        confidence: tData.confidence ?? null,
        effort: tData.effort ?? null,
        recurrenceType: RecurrenceType.createUnsafe('none'),
        boardPosition: i,
      })

      await this.taskRepo.save(task)

      const log = TaskActivityLog.create({
        taskId: task.id.value,
        userId: req.ownerUserId,
        action: 'created',
        fromValue: null,
        toValue: template.name,
      })
      await this.logRepo.save(log)

      taskIds.push(task.id.value)
    }

    return right({ taskIds })
  }
}
