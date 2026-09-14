export class EmptyBatchError extends Error {
  constructor() {
    super('O lote não tem nenhum post.')
    this.name = 'EmptyBatchError'
  }
}
