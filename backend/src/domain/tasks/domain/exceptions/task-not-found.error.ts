export class TaskNotFoundError extends Error {
  constructor(id: string) { super(`Task "${id}" not found`) }
}
