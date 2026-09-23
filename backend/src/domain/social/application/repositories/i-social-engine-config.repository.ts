/**
 * Credenciais do motor de publicação, guardadas no banco.
 *
 * Existe para que um agente consiga cadastrá-las pela API, sem SSH em produção.
 * O .env segue valendo como fallback de bootstrap — ver PostizSocialEngineAdapter.
 */
export interface SocialEngineConfigRecord {
  apiUrl: string
  apiKey: string
  createdAt: Date
  updatedAt: Date
}

export abstract class ISocialEngineConfigRepository {
  abstract find(): Promise<SocialEngineConfigRecord | null>
  abstract save(input: { apiUrl: string; apiKey: string }): Promise<void>
}
