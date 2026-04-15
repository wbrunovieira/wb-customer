import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskCommentRepository } from '../repositories/i-task-comment.repository'
import { randomUUID } from 'crypto'

interface Req {
  commentId: string
  imageUrl: string
  x: number
  y: number
  text: string
}

class NotFoundError extends Error {}

type Res = Either<NotFoundError, { annotationId: string; number: number }>

@Injectable()
export class AddImageAnnotationUseCase {
  constructor(private readonly commentRepo: ITaskCommentRepository) {}

  async execute(req: Req): Promise<Res> {
    const comment = await this.commentRepo.findById(req.commentId)
    if (!comment) return left(new NotFoundError('Comentário não encontrado'))

    const count = await this.commentRepo.countAnnotations(req.commentId)
    const number = count + 1
    const annotationId = randomUUID()

    await this.commentRepo.addAnnotation(req.commentId, {
      id: annotationId,
      imageUrl: req.imageUrl,
      x: req.x,
      y: req.y,
      number,
      text: req.text,
    })

    return right({ annotationId, number })
  }
}
