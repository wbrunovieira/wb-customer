import { TaskTemplate as PrismaTaskTemplate } from '@prisma/client'
import { TaskTemplate, TemplateTaskData } from '@/domain/tasks/enterprise/entities/task-template'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class TaskTemplateMapper {
  static toDomain(raw: PrismaTaskTemplate): TaskTemplate {
    return TaskTemplate.restore(
      {
        name: raw.name,
        description: raw.description,
        tasks: raw.tasks as unknown as TemplateTaskData[],
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(template: TaskTemplate) {
    return {
      id: template.id.value,
      name: template.name,
      description: template.description,
      tasks: template.tasks as object,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }
  }
}
