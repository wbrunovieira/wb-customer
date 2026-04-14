import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskCommentRepository } from '../repositories/i-task-comment.repository'

type Res = Either<Error, void>

@Injectable()
export class DeleteCommentUseCase {
  constructor(private readonly repo: ITaskCommentRepository) {}
  async execute(req: { commentId: string }): Promise<Res> {
    const comment = await this.repo.findById(req.commentId)
    if (!comment) return left(new Error('Comment not found'))
    comment.softDelete()
    await this.repo.save(comment)
    return right(undefined)
  }
}
