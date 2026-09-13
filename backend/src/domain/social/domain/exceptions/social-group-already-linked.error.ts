export class SocialGroupAlreadyLinkedError extends Error {
  constructor(groupId: string, customerName: string) {
    super(
      `Grupo "${groupId}" já pertence ao cliente "${customerName}". Um grupo publica para um cliente só.`,
    )
    this.name = 'SocialGroupAlreadyLinkedError'
  }
}
