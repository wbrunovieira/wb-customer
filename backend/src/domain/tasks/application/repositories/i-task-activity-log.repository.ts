import { TaskActivityLog } from '../../enterprise/entities/task-activity-log'

export abstract class ITaskActivityLogRepository {
  abstract findByTaskId(taskId: string): Promise<TaskActivityLog[]>
  abstract save(log: TaskActivityLog): Promise<void>
}
