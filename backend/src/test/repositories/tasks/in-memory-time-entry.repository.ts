import { ITimeEntryRepository } from '@/domain/tasks/application/repositories/i-time-entry.repository'
import { TimeEntry } from '@/domain/tasks/enterprise/entities/time-entry'

export class InMemoryTimeEntryRepository implements ITimeEntryRepository {
  items: TimeEntry[] = []

  async findById(id: string): Promise<TimeEntry | null> {
    return this.items.find((e) => e.id.value === id) ?? null
  }

  async findActiveByTaskAndUser(taskId: string, userId: string): Promise<TimeEntry | null> {
    return (
      this.items.find(
        (e) => e.taskId === taskId && e.userId === userId && e.isRunning,
      ) ?? null
    )
  }

  async findByTaskId(taskId: string): Promise<TimeEntry[]> {
    return this.items.filter((e) => e.taskId === taskId)
  }

  async save(entry: TimeEntry): Promise<void> {
    const idx = this.items.findIndex((e) => e.id.value === entry.id.value)
    if (idx >= 0) this.items[idx] = entry
    else this.items.push(entry)
  }
}

