import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IRefreshTokenRepository } from '../repositories/i-refresh-token.repository'
import { InvalidTokenError } from '../../domain/exceptions/invalid-token.error'

export interface LogoutRequest {
  refreshToken: string
}

export type LogoutResult = Either<InvalidTokenError, void>

@Injectable()
export class LogoutUseCase {
  constructor(private readonly refreshTokenRepo: IRefreshTokenRepository) {}

  async execute(request: LogoutRequest): Promise<LogoutResult> {
    const token = await this.refreshTokenRepo.findByToken(request.refreshToken)
    if (!token) return left(new InvalidTokenError())

    token.revoke()
    await this.refreshTokenRepo.save(token)

    return right(undefined)
  }
}
