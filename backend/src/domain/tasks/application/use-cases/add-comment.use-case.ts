import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITaskCommentRepository } from '../repositories/i-task-comment.repository'
import { TaskComment } from '../../enterprise/entities/task-comment'

interface Req { taskId: string; authorUserId: string; body?: string; audioUrl?: string; parentId?: string }
type Res = Either<never, { commentId: string }>

@Injectable()
export class AddCommentUseCase {
  constructor(private readonly repo: ITaskCommentRepository) {}
  async execute(req: Req): Promise<Res> {
    const comment = TaskComment.create({
      taskId: req.taskId,
      parentId: req.parentId ?? null,
      authorUserId: req.authorUserId,
      body: req.body ?? null,
      audioUrl: req.audioUrl ?? null,
    })
    await this.repo.save(comment)
    return right({ commentId: comment.id.value })
  }
}
