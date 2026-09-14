/**
 * Teto do lote.
 *
 * A API pública do motor aceita 90 requisições por hora. Um post com arte custa
 * duas (subir a mídia, criar o post), então 40 itens já encostam em 80 — e
 * ainda é preciso sobrar folga para a reconciliação, que consulta a fila a cada
 * quinze minutos. O calendário real de quatro semanas tem cerca de 32 posts,
 * então o teto cabe no caso de uso e protege o que vem depois dele.
 */
export const MAX_BATCH_SIZE = 40

export class BatchTooLargeError extends Error {
  constructor(size: number) {
    super(
      `Lote de ${size} posts excede o limite de ${MAX_BATCH_SIZE}. O motor aceita 90 requisições por hora e um post com arte custa duas; divida o lote.`,
    )
    this.name = 'BatchTooLargeError'
  }
}
