import { ITaskActivityLogRepository } from '@/domain/tasks/application/repositories/i-task-activity-log.repository'
import { TaskActivityLog } from '@/domain/tasks/enterprise/entities/task-activity-log'

export class InMemoryTaskActivityLogRepository implements ITaskActivityLogRepository {
  items: TaskActivityLog[] = []

  async findByTaskId(taskId: string): Promise<TaskActivityLog[]> {
    return this.items.filter(l => l.taskId === taskId)
  }

  async save(log: TaskActivityLog): Promise<void> {
    this.items.push(log)
  }
}
