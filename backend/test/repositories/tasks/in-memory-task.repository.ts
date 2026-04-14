import { ITaskRepository, FindManyTasksParams, PaginatedTasks } from '@/domain/tasks/application/repositories/i-task.repository'
import { Task } from '@/domain/tasks/enterprise/entities/task'

export class InMemoryTaskRepository implements ITaskRepository {
  items: Task[] = []

  async findById(id: string): Promise<Task | null> {
    return this.items.find(t => t.id.value === id) ?? null
  }

  async findByCustomerId(customerId: string, params: FindManyTasksParams): Promise<PaginatedTasks> {
    let items = this.items.filter(t => t.customerId === customerId && !t.deletedAt)

    if (params.status) items = items.filter(t => t.status.value === params.status)
    if (params.sprintId !== undefined) items = items.filter(t => t.sprintId === params.sprintId)
    if (params.assigneeUserId) items = items.filter(t => t.assigneeUserId === params.assigneeUserId)
    if (params.parentTaskId !== undefined) items = items.filter(t => t.parentTaskId === params.parentTaskId)
    if (params.ideasOnly) items = items.filter(t => t.status.isIdea())

    const total = items.length
    const page = params.page ?? 1
    const limit = params.limit ?? 50
    const paged = items.slice((page - 1) * limit, page * limit)
    return { items: paged, total }
  }

  async save(task: Task): Promise<void> {
    const idx = this.items.findIndex(t => t.id.value === task.id.value)
    if (idx >= 0) this.items[idx] = task
    else this.items.push(task)
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter(t => t.id.value !== id)
  }
}
