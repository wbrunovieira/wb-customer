import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITaskCommentRepository } from '../repositories/i-task-comment.repository'

type Res = Either<never, void>

@Injectable()
export class ReactToCommentUseCase {
  constructor(private readonly repo: ITaskCommentRepository) {}
  async execute(req: { commentId: string; userId: string; emoji: string; toggle: boolean }): Promise<Res> {
    if (req.toggle) {
      await this.repo.addReaction(req.commentId, req.userId, req.emoji)
    } else {
      await this.repo.removeReaction(req.commentId, req.userId, req.emoji)
    }
    return right(undefined)
  }
}
