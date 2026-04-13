export class DocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Document "${documentId}" not found`)
    this.name = 'DocumentNotFoundError'
  }
}
