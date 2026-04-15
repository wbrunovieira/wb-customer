import { TimeEntry } from '../../enterprise/entities/time-entry'

export abstract class ITimeEntryRepository {
  abstract findById(id: string): Promise<TimeEntry | null>
  abstract findActiveByTaskAndUser(taskId: string, userId: string): Promise<TimeEntry | null>
  abstract findByTaskId(taskId: string): Promise<TimeEntry[]>
  abstract save(entry: TimeEntry): Promise<void>
}
