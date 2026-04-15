import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ITaskCommentRepository } from '../repositories/i-task-comment.repository'
import { IStorageAdapter } from '@/domain/documents/application/services/i-storage.adapter'
import { randomUUID } from 'crypto'

interface Req {
  commentId: string
  buffer: Buffer
  fileName: string
  mimeType: string
  sizeBytes: number | null
}

class NotFoundError extends Error {}

type Res = Either<NotFoundError, { attachmentId: string; url: string }>

@Injectable()
export class AddCommentAttachmentUseCase {
  constructor(
    private readonly commentRepo: ITaskCommentRepository,
    private readonly storage: IStorageAdapter,
  ) {}

  async execute(req: Req): Promise<Res> {
    const comment = await this.commentRepo.findById(req.commentId)
    if (!comment) return left(new NotFoundError('Comentário não encontrado'))

    const result = await this.storage.uploadFile({
      folderId: 'comment-attachments',
      fileName: req.fileName,
      mimeType: req.mimeType,
      buffer: req.buffer,
    })

    const attachmentId = randomUUID()
    await this.commentRepo.addAttachment(req.commentId, {
      id: attachmentId,
      url: result.viewUrl,
      name: req.fileName,
      mimeType: req.mimeType,
      sizeBytes: req.sizeBytes,
    })

    return right({ attachmentId, url: result.viewUrl })
  }
}
