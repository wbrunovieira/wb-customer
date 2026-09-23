export class InvalidSocialEngineConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidSocialEngineConfigError'
  }
}
