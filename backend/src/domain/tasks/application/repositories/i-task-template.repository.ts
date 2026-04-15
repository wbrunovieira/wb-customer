import { TaskTemplate } from '../../enterprise/entities/task-template'

export abstract class ITaskTemplateRepository {
  abstract findById(id: string): Promise<TaskTemplate | null>
  abstract findAll(): Promise<TaskTemplate[]>
  abstract save(template: TaskTemplate): Promise<void>
  abstract delete(id: string): Promise<void>
}
