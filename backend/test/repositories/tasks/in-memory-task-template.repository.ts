import { ITaskTemplateRepository } from '@/domain/tasks/application/repositories/i-task-template.repository'
import { TaskTemplate } from '@/domain/tasks/enterprise/entities/task-template'

export class InMemoryTaskTemplateRepository implements ITaskTemplateRepository {
  items: TaskTemplate[] = []

  async findById(id: string): Promise<TaskTemplate | null> {
    return this.items.find((t) => t.id.value === id) ?? null
  }

  async findAll(): Promise<TaskTemplate[]> {
    return [...this.items]
  }

  async save(template: TaskTemplate): Promise<void> {
    const idx = this.items.findIndex((t) => t.id.value === template.id.value)
    if (idx >= 0) this.items[idx] = template
    else this.items.push(template)
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((t) => t.id.value !== id)
  }
}
