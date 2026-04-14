import { ChecklistItem } from '../../enterprise/entities/checklist-item'

export abstract class IChecklistItemRepository {
  abstract findById(id: string): Promise<ChecklistItem | null>
  abstract findByTaskId(taskId: string): Promise<ChecklistItem[]>
  abstract save(item: ChecklistItem): Promise<void>
  abstract delete(id: string): Promise<void>
}
