export class MeetingNotFoundError extends Error {
  constructor(id: string) {
    super(`Meeting "${id}" not found`)
    this.name = 'MeetingNotFoundError'
  }
}
