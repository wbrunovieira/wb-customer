export class TaskTagNotFoundError extends Error {
  constructor(id: string) { super(`TaskTag "${id}" not found`) }
}
