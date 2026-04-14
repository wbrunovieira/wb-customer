import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITaskTagRepository } from '../repositories/i-task-tag.repository'
import { TaskTag } from '../../enterprise/entities/task-tag'

export type CreateTaskTagResult = Either<never, { tagId: string }>

@Injectable()
export class CreateTaskTagUseCase {
  constructor(private readonly tagRepo: ITaskTagRepository) {}

  async execute(req: { customerId?: string; name: string; color?: string }): Promise<CreateTaskTagResult> {
    const tag = TaskTag.create({ customerId: req.customerId ?? null, name: req.name, color: req.color ?? '#3B82F6' })
    await this.tagRepo.save(tag)
    return right({ tagId: tag.id.value })
  }
}
