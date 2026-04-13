import { describe, it, expect, beforeEach } from 'vitest'
import { RefreshAccessTokenUseCase } from './refresh-access-token.use-case'
import { InMemoryRefreshTokenRepository } from '@/test/repositories/auth/in-memory-refresh-token.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/auth/in-memory-user-authorization.repository'
import { FakeTokenService } from '@/test/repositories/auth/fake-token.service'
import { RefreshToken } from '../../enterprise/entities/refresh-token'
import { UserAuthorization } from '../../enterprise/entities/user-authorization'
import { UserRole } from '../../enterprise/value-objects/user-role.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { InvalidTokenError } from '../../domain/exceptions/invalid-token.error'

let refreshTokenRepo: InMemoryRefreshTokenRepository
let authorizationRepo: InMemoryUserAuthorizationRepository
let tokenService: FakeTokenService
let sut: RefreshAccessTokenUseCase

const userId = 'user-123'

beforeEach(() => {
  refreshTokenRepo = new InMemoryRefreshTokenRepository()
  authorizationRepo = new InMemoryUserAuthorizationRepository()
  tokenService = new FakeTokenService()

  authorizationRepo.items.push(
    UserAuthorization.create(
      { userId, role: UserRole.createUnsafe('admin') },
      new UniqueEntityID(),
    ),
  )

  sut = new RefreshAccessTokenUseCase(
    refreshTokenRepo,
    authorizationRepo,
    tokenService,
  )
})

describe('RefreshAccessTokenUseCase', () => {
  it('should return a new access token for a valid refresh token', async () => {
    const token = RefreshToken.create({
      userId,
      token: 'valid-refresh-token',
      expiresAt: new Date(Date.now() + 86400000),
    })
    refreshTokenRepo.items.push(token)

    const result = await sut.execute({ refreshToken: 'valid-refresh-token' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accessToken).toContain(userId)
    }
  })

  it('should return InvalidTokenError for a non-existent token', async () => {
    const result = await sut.execute({ refreshToken: 'ghost-token' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidTokenError)
    }
  })

  it('should return InvalidTokenError for an expired token', async () => {
    const token = RefreshToken.create({
      userId,
      token: 'expired-token',
      expiresAt: new Date(Date.now() - 1000),
    })
    refreshTokenRepo.items.push(token)

    const result = await sut.execute({ refreshToken: 'expired-token' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidTokenError)
    }
  })

  it('should return InvalidTokenError for a revoked token', async () => {
    const token = RefreshToken.create({
      userId,
      token: 'revoked-token',
      expiresAt: new Date(Date.now() + 86400000),
    })
    token.revoke()
    refreshTokenRepo.items.push(token)

    const result = await sut.execute({ refreshToken: 'revoked-token' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidTokenError)
    }
  })
})
