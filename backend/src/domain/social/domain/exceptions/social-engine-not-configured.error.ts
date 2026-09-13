export class SocialEngineNotConfiguredError extends Error {
  constructor() {
    super(
      'Motor de publicação não configurado. Defina POSTIZ_API_URL e POSTIZ_API_KEY.',
    )
    this.name = 'SocialEngineNotConfiguredError'
  }
}
