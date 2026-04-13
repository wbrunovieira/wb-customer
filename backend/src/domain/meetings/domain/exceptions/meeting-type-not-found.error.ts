export class MeetingTypeNotFoundError extends Error {
  constructor(id: string) {
    super(`Meeting type "${id}" not found`)
    this.name = 'MeetingTypeNotFoundError'
  }
}
