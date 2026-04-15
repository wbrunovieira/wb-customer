export class CreativeNotFoundError extends Error {
  constructor(id: string) {
    super(`Creative "${id}" not found`)
    this.name = 'CreativeNotFoundError'
  }
}
