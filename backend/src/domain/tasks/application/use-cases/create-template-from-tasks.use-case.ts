import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskRepository } from '../repositories/i-task.repository'
import { ITaskTemplateRepository } from '../repositories/i-task-template.repository'
import { TaskTemplate, TemplateTaskData } from '../../enterprise/entities/task-template'

interface Req {
  name: string
  description?: string | null
  taskIds: string[]
}

class ValidationError extends Error {}

type Res = Either<ValidationError, { templateId: string }>

@Injectable()
export class CreateTemplateFromTasksUseCase {
  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly templateRepo: ITaskTemplateRepository,
  ) {}

  async execute(req: Req): Promise<Res> {
    if (!req.name?.trim()) return left(new ValidationError('Nome é obrigatório'))

    const taskData: TemplateTaskData[] = []

    for (const id of req.taskIds) {
      const task = await this.taskRepo.findById(id)
      if (!task) continue
      taskData.push({
        title: task.title,
        description: task.description,
        status: task.status.value,
        estimatedHours: task.estimatedHours,
        impact: task.impact,
        confidence: task.confidence,
        effort: task.effort,
      })
    }

    if (taskData.length === 0) {
      return left(new ValidationError('Nenhuma tarefa encontrada para os IDs fornecidos'))
    }

    const template = TaskTemplate.create({
      name: req.name.trim(),
      description: req.description ?? null,
      tasks: taskData,
    })

    await this.templateRepo.save(template)
    return right({ templateId: template.id.value })
  }
}
