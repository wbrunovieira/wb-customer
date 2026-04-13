export class CustomerUserNotFoundError extends Error {
  constructor(id: string) {
    super(`Customer portal user "${id}" not found`)
    this.name = 'CustomerUserNotFoundError'
  }
}
