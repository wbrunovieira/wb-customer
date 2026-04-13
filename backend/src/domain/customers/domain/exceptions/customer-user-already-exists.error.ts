export class CustomerUserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`A portal user with email "${email}" already exists`)
    this.name = 'CustomerUserAlreadyExistsError'
  }
}
