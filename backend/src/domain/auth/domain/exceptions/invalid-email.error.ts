export class InvalidEmailError extends Error {
  constructor(email: string) {
    super(`"${email}" is not a valid email address`)
    this.name = 'InvalidEmailError'
  }
}
