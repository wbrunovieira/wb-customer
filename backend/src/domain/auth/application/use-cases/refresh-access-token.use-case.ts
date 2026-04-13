import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IUserAuthorizationRepository } from '../repositories/i-user-authorization.repository'
import { IRefreshTokenRepository } from '../repositories/i-refresh-token.repository'
import { ITokenService } from '../services/i-token.service'
import { InvalidTokenError } from '../../domain/exceptions/invalid-token.error'

export interface RefreshAccessTokenRequest {
  refreshToken: string
}

export interface RefreshAccessTokenResponse {
  accessToken: string
}

export type RefreshAccessTokenResult = Either<
  InvalidTokenError,
  RefreshAccessTokenResponse
>

@Injectable()
export class RefreshAccessTokenUseCase {
  constructor(
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly userAuthorizationRepo: IUserAuthorizationRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(
    request: RefreshAccessTokenRequest,
  ): Promise<RefreshAccessTokenResult> {
    const token = await this.refreshTokenRepo.findByToken(request.refreshToken)
    if (!token || !token.isValid) return left(new InvalidTokenError())

    const authorization = await this.userAuthorizationRepo.findByUserId(
      token.userId,
    )
    if (!authorization) return left(new InvalidTokenError())

    const accessToken = this.tokenService.generateAccessToken({
      sub: token.userId,
      role: authorization.role.value,
    })

    return right({ accessToken })
  }
}
