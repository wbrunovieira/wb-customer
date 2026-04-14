import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ITaskCommentRepository } from '../repositories/i-task-comment.repository'
import { TaskComment } from '../../enterprise/entities/task-comment'

type Res = Either<never, { comments: TaskComment[] }>

@Injectable()
export class ListCommentsUseCase {
  constructor(private readonly repo: ITaskCommentRepository) {}
  async execute(req: { taskId: string }): Promise<Res> {
    const comments = await this.repo.findByTaskId(req.taskId)
    return right({ comments })
  }
}
