import { IChecklistItemRepository } from '@/domain/tasks/application/repositories/i-checklist-item.repository'
import { ChecklistItem } from '@/domain/tasks/enterprise/entities/checklist-item'

export class InMemoryChecklistItemRepository implements IChecklistItemRepository {
  items: ChecklistItem[] = []

  async findById(id: string): Promise<ChecklistItem | null> {
    return this.items.find(i => i.id.value === id) ?? null
  }

  async findByTaskId(taskId: string): Promise<ChecklistItem[]> {
    return this.items.filter(i => i.taskId === taskId).sort((a, b) => a.position - b.position)
  }

  async save(item: ChecklistItem): Promise<void> {
    const idx = this.items.findIndex(i => i.id.value === item.id.value)
    if (idx >= 0) this.items[idx] = item
    else this.items.push(item)
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter(i => i.id.value !== id)
  }
}
