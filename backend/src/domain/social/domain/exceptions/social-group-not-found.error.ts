export class SocialGroupNotFoundError extends Error {
  constructor(groupId: string) {
    super(
      `Grupo "${groupId}" não existe no motor de publicação. Conecte a conta e nomeie o cliente antes de ligar.`,
    )
    this.name = 'SocialGroupNotFoundError'
  }
}
