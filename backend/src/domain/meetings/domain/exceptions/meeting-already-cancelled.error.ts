export class MeetingAlreadyCancelledError extends Error {
  constructor(id: string) {
    super(`Meeting "${id}" is already cancelled`)
    this.name = 'MeetingAlreadyCancelledError'
  }
}
