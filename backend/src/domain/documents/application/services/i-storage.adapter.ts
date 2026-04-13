export interface UploadFileParams {
  folderId: string
  fileName: string
  mimeType: string
  buffer: Buffer
}

export interface UploadFileResult {
  fileId: string
  viewUrl: string
  downloadUrl: string
}

export abstract class IStorageAdapter {
  abstract uploadFile(params: UploadFileParams): Promise<UploadFileResult>
  abstract deleteFile(fileId: string): Promise<void>
}
