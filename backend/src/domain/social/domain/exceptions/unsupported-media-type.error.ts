/** Extensões que o motor aceita no caminho da mídia. */
export const SUPPORTED_MEDIA_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'video/mp4',
] as const

export class UnsupportedMediaTypeError extends Error {
  constructor(mimeType: string | null) {
    super(
      `Formato "${mimeType ?? 'desconhecido'}" não é aceito nas redes. Use PNG, JPEG, GIF, WEBP ou MP4.`,
    )
    this.name = 'UnsupportedMediaTypeError'
  }
}
