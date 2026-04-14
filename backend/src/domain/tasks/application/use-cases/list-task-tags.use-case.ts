import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITaskTagRepository } from '../repositories/i-task-tag.repository'
import { TaskTag } from '../../enterprise/entities/task-tag'

export type ListTaskTagsResult = Either<never, { tags: TaskTag[] }>

@Injectable()
export class ListTaskTagsUseCase {
  constructor(private readonly tagRepo: ITaskTagRepository) {}

  async execute(req: { customerId?: string }): Promise<ListTaskTagsResult> {
    const tags = await this.tagRepo.findByCustomerId(req.customerId ?? null)
    return right({ tags })
  }
}
