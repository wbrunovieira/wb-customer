/**
 * Teto do lote, medido em REQUISIÇÕES ao motor — não em posts.
 *
 * A API pública do motor aceita 90 requisições por hora. Um post custa uma
 * chamada para ser criado, mais uma por imagem: um carrossel de cinco custa
 * seis. Contar posts esconderia isso, e quarenta posts com carrossel passariam
 * de duzentas chamadas num teto de noventa.
 *
 * O limite fica abaixo de 90 de propósito: a reconciliação consulta a fila a
 * cada quinze minutos e a coleta de métricas roda uma vez por dia, e as duas
 * precisam de espaço no mesmo teto.
 */
export const MAX_BATCH_REQUESTS = 70

export class BatchTooLargeError extends Error {
  constructor(requests: number, posts: number) {
    super(
      `Este lote custaria ${requests} requisições ao motor (${posts} posts mais as imagens de cada um), acima do limite de ${MAX_BATCH_REQUESTS}. O motor aceita 90 por hora e a reconciliação precisa de folga; divida o lote.`,
    )
    this.name = 'BatchTooLargeError'
  }
}
