import { Task } from '../../enterprise/entities/task'

export interface FindManyTasksParams {
  status?: string
  sprintId?: string
  assigneeUserId?: string
  parentTaskId?: string | null
  ideasOnly?: boolean
  page?: number
  limit?: number
}

export interface PaginatedTasks {
  items: Task[]
  total: number
}

export interface FindAllTasksParams extends FindManyTasksParams {
  customerId?: string
  recurrenceType?: string
  invertRecurrence?: boolean
}

export abstract class ITaskRepository {
  abstract findById(id: string): Promise<Task | null>
  abstract findByCustomerId(customerId: string, params: FindManyTasksParams): Promise<PaginatedTasks>
  abstract findAll(params: FindAllTasksParams): Promise<PaginatedTasks>
  abstract save(task: Task): Promise<void>
  abstract delete(id: string): Promise<void>
}
