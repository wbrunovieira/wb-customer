export class SocialEngineNotConfiguredError extends Error {
  constructor() {
    super(
      'Motor de publicação não configurado. Cadastre as credenciais em ' +
        'POST /api/v1/admin/social-engine (aceita x-api-key), ou defina ' +
        'POSTIZ_API_URL e POSTIZ_API_KEY no ambiente.',
    )
    this.name = 'SocialEngineNotConfiguredError'
  }
}
