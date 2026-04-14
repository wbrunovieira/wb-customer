export class SprintNotFoundError extends Error {
  constructor(id: string) { super(`Sprint "${id}" not found`) }
}
