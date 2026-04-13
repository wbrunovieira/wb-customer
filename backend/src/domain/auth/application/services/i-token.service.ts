export interface TokenPayload {
  sub: string
  role: string
}

export abstract class ITokenService {
  abstract generateAccessToken(payload: TokenPayload): string
  abstract generateRefreshToken(): string
  abstract getRefreshTokenExpiry(): Date
}
