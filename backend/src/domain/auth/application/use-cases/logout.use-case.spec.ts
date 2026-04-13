import { describe, it, expect, beforeEach } from 'vitest'
import { LogoutUseCase } from './logout.use-case'
import { InMemoryRefreshTokenRepository } from '@/test/repositories/auth/in-memory-refresh-token.repository'
import { RefreshToken } from '../../enterprise/entities/refresh-token'
import { InvalidTokenError } from '../../domain/exceptions/invalid-token.error'

let refreshTokenRepo: InMemoryRefreshTokenRepository
let sut: LogoutUseCase

beforeEach(() => {
  refreshTokenRepo = new InMemoryRefreshTokenRepository()
  sut = new LogoutUseCase(refreshTokenRepo)
})

describe('LogoutUseCase', () => {
  it('should revoke the refresh token on logout', async () => {
    const token = RefreshToken.create({
      userId: 'user-1',
      token: 'valid-token',
      expiresAt: new Date(Date.now() + 86400000),
    })
    refreshTokenRepo.items.push(token)

    const result = await sut.execute({ refreshToken: 'valid-token' })

    expect(result.isRight()).toBe(true)
    expect(refreshTokenRepo.items[0].isRevoked).toBe(true)
    expect(refreshTokenRepo.items[0].revokedAt).not.toBeNull()
  })

  it('should return InvalidTokenError for non-existent token', async () => {
    const result = await sut.execute({ refreshToken: 'ghost-token' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidTokenError)
    }
  })

  it('should still revoke an already-expired token', async () => {
    const token = RefreshToken.create({
      userId: 'user-1',
      token: 'expired-token',
      expiresAt: new Date(Date.now() - 1000),
    })
    refreshTokenRepo.items.push(token)

    const result = await sut.execute({ refreshToken: 'expired-token' })

    expect(result.isRight()).toBe(true)
    expect(refreshTokenRepo.items[0].isRevoked).toBe(true)
  })
})
