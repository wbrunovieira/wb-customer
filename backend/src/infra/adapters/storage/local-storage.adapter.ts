import { Injectable } from '@nestjs/common'
import {
  IStorageAdapter,
  UploadFileParams,
  UploadFileResult,
} from '@/domain/documents/application/services/i-storage.adapter'
import { randomUUID } from 'crypto'

@Injectable()
export class LocalStorageAdapter implements IStorageAdapter {
  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    const fileId = `local-file-${randomUUID().slice(0, 8)}`
    const slug = params.fileName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return {
      fileId,
      viewUrl: `http://localhost:3000/storage/view/${fileId}/${slug}`,
      downloadUrl: `http://localhost:3000/storage/download/${fileId}/${slug}`,
    }
  }

  /**
   * O adapter local nunca guardou bytes — devolve URLs de fachada. Estourar com
   * o motivo é melhor do que devolver um buffer vazio, que viraria um upload de
   * arquivo corrompido lá na frente, longe da causa.
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    throw new Error(
      `Storage local não guarda conteúdo; não há bytes para "${fileId}". Use STORAGE_ADAPTER=google-drive para publicar mídia.`,
    )
  }

  async deleteFile(_fileId: string): Promise<void> {
    // Local adapter: nothing to delete
  }
}
