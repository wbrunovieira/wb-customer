import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IStorageAdapter } from '@/domain/documents/application/services/i-storage.adapter'
import { randomUUID } from 'crypto'

const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/aac']

interface Req {
  buffer: Buffer
  mimeType: string
  taskId: string
}

class ValidationError extends Error {}

type Res = Either<ValidationError, { audioUrl: string }>

@Injectable()
export class UploadCommentAudioUseCase {
  constructor(private readonly storage: IStorageAdapter) {}

  async execute(req: Req): Promise<Res> {
    if (!ALLOWED_AUDIO_TYPES.includes(req.mimeType)) {
      return left(new ValidationError(`Tipo de arquivo inválido. Apenas áudio é permitido.`))
    }

    const ext = req.mimeType.split('/')[1].split(';')[0]
    const fileName = `audio-${randomUUID()}.${ext}`

    const result = await this.storage.uploadFile({
      folderId: 'comment-audio',
      fileName,
      mimeType: req.mimeType,
      buffer: req.buffer,
    })

    return right({ audioUrl: result.viewUrl })
  }
}
