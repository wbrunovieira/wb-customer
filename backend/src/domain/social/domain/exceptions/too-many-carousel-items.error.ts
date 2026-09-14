/**
 * Teto de imagens num post.
 *
 * É o limite do carrossel do Instagram, que é a rede mais restritiva entre as
 * que usamos. Recusar aqui evita subir dez arquivos para o motor e só então
 * descobrir que a rede recusa o post inteiro.
 */
export const MAX_CAROUSEL_ITEMS = 10

export class TooManyCarouselItemsError extends Error {
  constructor(count: number) {
    super(
      `Um post aceita no máximo ${MAX_CAROUSEL_ITEMS} imagens; vieram ${count}.`,
    )
    this.name = 'TooManyCarouselItemsError'
  }
}
