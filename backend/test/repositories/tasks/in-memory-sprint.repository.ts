import { ISprintRepository } from '@/domain/tasks/application/repositories/i-sprint.repository'
import { Sprint } from '@/domain/tasks/enterprise/entities/sprint'

export class InMemorySprintRepository implements ISprintRepository {
  items: Sprint[] = []

  async findById(id: string): Promise<Sprint | null> {
    return this.items.find(s => s.id.value === id) ?? null
  }

  async findByCustomerId(customerId: string): Promise<Sprint[]> {
    return this.items.filter(s => s.customerId === customerId)
  }

  async save(sprint: Sprint): Promise<void> {
    const idx = this.items.findIndex(s => s.id.value === sprint.id.value)
    if (idx >= 0) this.items[idx] = sprint
    else this.items.push(sprint)
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter(s => s.id.value !== id)
  }
}
