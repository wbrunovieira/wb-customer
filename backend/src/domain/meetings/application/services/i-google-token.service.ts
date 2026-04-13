export interface GoogleTokenData {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  scope: string
  email: string
}

export abstract class IGoogleTokenService {
  abstract getToken(): Promise<GoogleTokenData | null>
  abstract saveToken(data: GoogleTokenData): Promise<void>
  abstract deleteToken(): Promise<void>
  abstract isTokenExpired(token: { expiresAt: Date }): boolean
}
