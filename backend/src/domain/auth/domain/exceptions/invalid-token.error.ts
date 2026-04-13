export class InvalidTokenError extends Error {
  constructor() {
    super('Token is invalid, expired or has been revoked')
    this.name = 'InvalidTokenError'
  }
}
