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

  async deleteFile(_fileId: string): Promise<void> {
    // Local adapter: nothing to delete
  }
}
