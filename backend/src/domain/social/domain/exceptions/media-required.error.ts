/**
 * O Instagram recusa post sem imagem ou vídeo — é regra da API da Meta, não do
 * motor. Existe aqui, e não depois, porque regra conhecida tem que reprovar
 * ANTES de gastar requisição do motor: o teto é de 90 por hora e é compartilhado
 * com quem está publicando de verdade.
 */
export class MediaRequiredError extends Error {
  constructor(public readonly providers: string[]) {
    const lista = [...new Set(providers)].join(', ')
    super(
      `${lista} exige pelo menos uma imagem ou vídeo. Envie creativeId ou creativeIds.`,
    )
    this.name = 'MediaRequiredError'
  }
}
