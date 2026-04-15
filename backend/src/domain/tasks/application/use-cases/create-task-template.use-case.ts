import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskTemplateRepository } from '../repositories/i-task-template.repository'
import { TaskTemplate, TemplateTaskData } from '../../enterprise/entities/task-template'

interface Req {
  name: string
  description?: string | null
  tasks: TemplateTaskData[]
}

class ValidationError extends Error {}

type Res = Either<ValidationError, { templateId: string }>

@Injectable()
export class CreateTaskTemplateUseCase {
  constructor(private readonly repo: ITaskTemplateRepository) {}

  async execute(req: Req): Promise<Res> {
    if (!req.name?.trim()) return left(new ValidationError('Nome é obrigatório'))
    if (!req.tasks.length) return left(new ValidationError('É necessário ao menos uma tarefa no template'))

    const template = TaskTemplate.create({
      name: req.name.trim(),
      description: req.description ?? null,
      tasks: req.tasks,
    })

    await this.repo.save(template)
    return right({ templateId: template.id.value })
  }
}
