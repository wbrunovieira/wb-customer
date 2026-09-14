export class CreativeHasNoFileError extends Error {
  constructor(creativeId: string) {
    super(
      `Criativo "${creativeId}" não tem arquivo enviado. Envie a arte antes de publicar com ela.`,
    )
    this.name = 'CreativeHasNoFileError'
  }
}
