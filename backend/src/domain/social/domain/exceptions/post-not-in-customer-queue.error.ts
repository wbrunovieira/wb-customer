export class PostNotInCustomerQueueError extends Error {
  constructor(postId: string) {
    super(
      `Post "${postId}" não está na fila deste cliente. Cancelar o post de outro cliente seria irreversível.`,
    )
    this.name = 'PostNotInCustomerQueueError'
  }
}
