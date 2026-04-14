import { ITaskTagRepository } from '@/domain/tasks/application/repositories/i-task-tag.repository'
import { TaskTag } from '@/domain/tasks/enterprise/entities/task-tag'

export class InMemoryTaskTagRepository implements ITaskTagRepository {
  items: TaskTag[] = []
  links: { taskId: string; tagId: string }[] = []

  async findById(id: string): Promise<TaskTag | null> {
    return this.items.find(t => t.id.value === id) ?? null
  }

  async findByCustomerId(customerId: string | null): Promise<TaskTag[]> {
    return this.items.filter(t => t.customerId === customerId || t.customerId === null)
  }

  async save(tag: TaskTag): Promise<void> {
    const idx = this.items.findIndex(t => t.id.value === tag.id.value)
    if (idx >= 0) this.items[idx] = tag
    else this.items.push(tag)
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter(t => t.id.value !== id)
  }

  async attachToTask(taskId: string, tagId: string): Promise<void> {
    if (!this.links.find(l => l.taskId === taskId && l.tagId === tagId)) {
      this.links.push({ taskId, tagId })
    }
  }

  async detachFromTask(taskId: string, tagId: string): Promise<void> {
    this.links = this.links.filter(l => !(l.taskId === taskId && l.tagId === tagId))
  }

  async findTagsByTaskId(taskId: string): Promise<TaskTag[]> {
    const tagIds = this.links.filter(l => l.taskId === taskId).map(l => l.tagId)
    return this.items.filter(t => tagIds.includes(t.id.value))
  }
}
