import { TaskTag } from '../../enterprise/entities/task-tag'

export abstract class ITaskTagRepository {
  abstract findById(id: string): Promise<TaskTag | null>
  abstract findByCustomerId(customerId: string | null): Promise<TaskTag[]>
  abstract save(tag: TaskTag): Promise<void>
  abstract delete(id: string): Promise<void>
  abstract attachToTask(taskId: string, tagId: string): Promise<void>
  abstract detachFromTask(taskId: string, tagId: string): Promise<void>
  abstract findTagsByTaskId(taskId: string): Promise<TaskTag[]>
}
