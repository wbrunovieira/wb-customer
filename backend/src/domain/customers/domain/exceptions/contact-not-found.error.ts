export class ContactNotFoundError extends Error {
  constructor(identifier?: string) {
    super(
      identifier ? `Contact "${identifier}" not found` : 'Contact not found',
    )
    this.name = 'ContactNotFoundError'
  }
}
