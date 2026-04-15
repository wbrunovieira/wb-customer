import { IStorageAdapter, UploadFileParams, UploadFileResult } from '@/domain/documents/application/services/i-storage.adapter'

export class FakeStorageAdapter implements IStorageAdapter {
  uploaded: UploadFileParams[] = []

  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    this.uploaded.push(params)
    const slug = params.fileName.replace(/\s+/g, '-')
    return {
      fileId: `fake-${slug}`,
      viewUrl: `https://storage.fake/${slug}`,
      downloadUrl: `https://storage.fake/download/${slug}`,
    }
  }

  async deleteFile(_fileId: string): Promise<void> {}
}
