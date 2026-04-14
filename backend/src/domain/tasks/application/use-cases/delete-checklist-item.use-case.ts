import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IChecklistItemRepository } from '../repositories/i-checklist-item.repository'

export type DeleteChecklistItemResult = Either<Error, void>

@Injectable()
export class DeleteChecklistItemUseCase {
  constructor(private readonly checklistRepo: IChecklistItemRepository) {}

  async execute(req: { itemId: string }): Promise<DeleteChecklistItemResult> {
    const item = await this.checklistRepo.findById(req.itemId)
    if (!item) return left(new Error('Checklist item not found'))
    await this.checklistRepo.delete(req.itemId)
    return right(undefined)
  }
}
