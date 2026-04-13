export class MeetingTypeAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Meeting type with name "${name}" already exists`)
    this.name = 'MeetingTypeAlreadyExistsError'
  }
}
