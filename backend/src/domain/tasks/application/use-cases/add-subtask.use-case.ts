import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskRepository } from '../repositories/i-task.repository'
import { Task } from '../../enterprise/entities/task'
import { TaskStatus } from '../../enterprise/value-objects/task-status.vo'
import { RecurrenceType } from '../../enterprise/value-objects/recurrence-type.vo'

interface Req { parentTaskId: string; customerId: string; ownerUserId: string; title: string; description?: string }
type Res = Either<Error, { taskId: string }>

@Injectable()
export class AddSubtaskUseCase {
  constructor(private readonly taskRepo: ITaskRepository) {}

  async execute(req: Req): Promise<Res> {
    const parent = await this.taskRepo.findById(req.parentTaskId)
    if (!parent) return left(new Error('Parent task not found'))

    const subtask = Task.create({
      customerId: req.customerId,
      sprintId: null,
      parentTaskId: req.parentTaskId,
      ownerUserId: req.ownerUserId,
      title: req.title,
      description: req.description ?? null,
      status: TaskStatus.createUnsafe('backlog'),
      recurrenceType: RecurrenceType.createUnsafe('none'),
    })
    await this.taskRepo.save(subtask)
    return right({ taskId: subtask.id.value })
  }
}
