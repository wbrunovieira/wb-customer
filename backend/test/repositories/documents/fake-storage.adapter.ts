import {
  IStorageAdapter,
  UploadFileParams,
  UploadFileResult,
} from '@/domain/documents/application/services/i-storage.adapter'

export class FakeStorageAdapter implements IStorageAdapter {
  public uploadedFiles: Array<UploadFileParams & UploadFileResult> = []
  public deletedFileIds: string[] = []

  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    const result: UploadFileResult = {
      fileId: `fake-file-${params.fileName.toLowerCase().replace(/\s+/g, '-')}`,
      viewUrl: `https://fake-storage/view/${params.fileName}`,
      downloadUrl: `https://fake-storage/download/${params.fileName}`,
    }
    this.uploadedFiles.push({ ...params, ...result })
    return result
  }

  async deleteFile(fileId: string): Promise<void> {
    this.deletedFileIds.push(fileId)
    this.uploadedFiles = this.uploadedFiles.filter((f) => f.fileId !== fileId)
  }
}
