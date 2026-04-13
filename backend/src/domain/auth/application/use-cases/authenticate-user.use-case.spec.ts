import { describe, it, expect, beforeEach } from 'vitest'
import { AuthenticateUserUseCase } from './authenticate-user.use-case'
import { CreateUserUseCase } from './create-user.use-case'
import { InMemoryUserIdentityRepository } from '@/test/repositories/auth/in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/auth/in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/auth/in-memory-user-authorization.repository'
import { InMemoryRefreshTokenRepository } from '@/test/repositories/auth/in-memory-refresh-token.repository'
import { InMemoryAuthUnitOfWork } from '@/test/repositories/auth/in-memory-auth-unit-of-work'
import { FakeTokenService } from '@/test/repositories/auth/fake-token.service'
import { FakeCustomerPortalLookup } from '@/test/repositories/auth/fake-customer-portal-lookup'
import { InvalidCredentialsError } from '../../domain/exceptions/invalid-credentials.error'

let identityRepo: InMemoryUserIdentityRepository
let profileRepo: InMemoryUserProfileRepository
let authorizationRepo: InMemoryUserAuthorizationRepository
let refreshTokenRepo: InMemoryRefreshTokenRepository
let tokenService: FakeTokenService
let portalLookup: FakeCustomerPortalLookup
let sut: AuthenticateUserUseCase

beforeEach(async () => {
  identityRepo = new InMemoryUserIdentityRepository()
  profileRepo = new InMemoryUserProfileRepository()
  authorizationRepo = new InMemoryUserAuthorizationRepository()
  refreshTokenRepo = new InMemoryRefreshTokenRepository()
  tokenService = new FakeTokenService()
  portalLookup = new FakeCustomerPortalLookup()

  const createUser = new CreateUserUseCase(
    identityRepo,
    profileRepo,
    authorizationRepo,
    new InMemoryAuthUnitOfWork(),
  )

  await createUser.execute({
    email: 'user@example.com',
    password: 'Password123@',
    name: 'Test User',
    role: 'admin',
  })

  sut = new AuthenticateUserUseCase(
    identityRepo,
    authorizationRepo,
    refreshTokenRepo,
    tokenService,
    portalLookup,
  )
})

describe('AuthenticateUserUseCase', () => {
  it('should authenticate with correct credentials', async () => {
    const result = await sut.execute({
      email: 'user@example.com',
      password: 'Password123@',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accessToken).toBeDefined()
      expect(result.value.refreshToken).toBeDefined()
      expect(result.value.role).toBe('admin')
    }
  })

  it('should save a refresh token on success', async () => {
    await sut.execute({ email: 'user@example.com', password: 'Password123@' })
    expect(refreshTokenRepo.items).toHaveLength(1)
    expect(refreshTokenRepo.items[0].isValid).toBe(true)
  })

  it('should return InvalidCredentialsError for wrong password', async () => {
    const result = await sut.execute({
      email: 'user@example.com',
      password: 'WrongPassword',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidCredentialsError)
    }
  })

  it('should return InvalidCredentialsError for non-existent email', async () => {
    const result = await sut.execute({
      email: 'ghost@example.com',
      password: 'Password123@',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidCredentialsError)
    }
  })

  it('should return InvalidCredentialsError for invalid email format', async () => {
    const result = await sut.execute({
      email: 'not-an-email',
      password: 'Password123@',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidCredentialsError)
    }
  })

  it('should return userId in response', async () => {
    const result = await sut.execute({
      email: 'user@example.com',
      password: 'Password123@',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.userId).toBe(identityRepo.items[0].id.value)
    }
  })
})
