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
  thumbnailUrl?: string | null
}

export abstract class IStorageAdapter {
  abstract uploadFile(params: UploadFileParams): Promise<UploadFileResult>
  /**
   * Bytes do arquivo guardado. Necessário para reenviar o arquivo a outro
   * serviço — o motor de publicação referencia mídia por id dele, então a URL
   * do Drive não serve: é preciso subir o conteúdo lá.
   */
  abstract downloadFile(fileId: string): Promise<Buffer>
  abstract deleteFile(fileId: string): Promise<void>
}
