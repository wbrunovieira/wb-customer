import { Injectable, Logger } from '@nestjs/common'
import { ITaskRepository } from '../repositories/i-task.repository'
import { Task } from '../../enterprise/entities/task'
import { TaskStatus } from '../../enterprise/value-objects/task-status.vo'
import { RecurrenceType } from '../../enterprise/value-objects/recurrence-type.vo'

@Injectable()
export class ProcessRecurringTasksUseCase {
  private readonly logger = new Logger(ProcessRecurringTasksUseCase.name)

  constructor(private readonly taskRepo: ITaskRepository) {}

  async execute(): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fetch all non-deleted tasks with recurrence != 'none'
    const { items } = await this.taskRepo.findAll({ recurrenceType: 'none', invertRecurrence: true, limit: 1000 })

    for (const task of items) {
      if (!this.isDue(task, today)) continue

      const copy = Task.create({
        customerId: task.customerId,
        sprintId: task.sprintId,
        parentTaskId: null,
        ownerUserId: task.ownerUserId,
        title: task.title,
        description: task.description,
        status: TaskStatus.createUnsafe('backlog'),
        recurrenceType: RecurrenceType.createUnsafe('none'), // copies are not themselves recurring
        impact: task.impact,
        confidence: task.confidence,
        effort: task.effort,
        estimatedHours: task.estimatedHours,
      })
      await this.taskRepo.save(copy)
      this.logger.log(`Created recurring copy of task ${task.id.value}: ${task.title}`)
    }
  }

  private isDue(task: Task, today: Date): boolean {
    const rec = task.recurrenceType.value
    const base = task.startAt ?? task.createdAt

    if (rec === 'daily') return true

    if (rec === 'weekly') {
      return today.getDay() === base.getDay()
    }

    if (rec === 'monthly') {
      return today.getDate() === base.getDate()
    }

    return false
  }
}
