import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITaskTemplateRepository } from '../repositories/i-task-template.repository'
import { TaskTemplate } from '../../enterprise/entities/task-template'

type Res = Either<never, { templates: TaskTemplate[] }>

@Injectable()
export class ListTaskTemplatesUseCase {
  constructor(private readonly repo: ITaskTemplateRepository) {}

  async execute(): Promise<Res> {
    const templates = await this.repo.findAll()
    return right({ templates })
  }
}
