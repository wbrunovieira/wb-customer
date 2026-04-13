import { describe, it, expect, beforeEach } from 'vitest'
import { GetCurrentUserUseCase } from './get-current-user.use-case'
import { CreateUserUseCase } from './create-user.use-case'
import { InMemoryUserIdentityRepository } from '@/test/repositories/auth/in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/auth/in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/auth/in-memory-user-authorization.repository'
import { InMemoryAuthUnitOfWork } from '@/test/repositories/auth/in-memory-auth-unit-of-work'
import { UserNotFoundError } from '../../domain/exceptions/user-not-found.error'

let identityRepo: InMemoryUserIdentityRepository
let profileRepo: InMemoryUserProfileRepository
let authorizationRepo: InMemoryUserAuthorizationRepository
let sut: GetCurrentUserUseCase
let createdUserId: string

beforeEach(async () => {
  identityRepo = new InMemoryUserIdentityRepository()
  profileRepo = new InMemoryUserProfileRepository()
  authorizationRepo = new InMemoryUserAuthorizationRepository()

  const createUser = new CreateUserUseCase(
    identityRepo,
    profileRepo,
    authorizationRepo,
    new InMemoryAuthUnitOfWork(),
  )

  const result = await createUser.execute({
    email: 'bruno@example.com',
    password: 'Password123@',
    name: 'Bruno Vieira',
    phone: '+5511999999999',
    role: 'admin',
  })

  if (result.isRight()) createdUserId = result.value.userId

  sut = new GetCurrentUserUseCase(
    identityRepo,
    profileRepo,
    authorizationRepo,
  )
})

describe('GetCurrentUserUseCase', () => {
  it('should return user data for a valid userId', async () => {
    const result = await sut.execute({ userId: createdUserId })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.email).toBe('bruno@example.com')
      expect(result.value.name).toBe('Bruno Vieira')
      expect(result.value.phone).toBe('+5511999999999')
      expect(result.value.role).toBe('admin')
      expect(result.value.id).toBe(createdUserId)
    }
  })

  it('should return UserNotFoundError for non-existent userId', async () => {
    const result = await sut.execute({ userId: 'non-existent-id' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(UserNotFoundError)
    }
  })

  it('should include createdAt in the response', async () => {
    const result = await sut.execute({ userId: createdUserId })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.createdAt).toBeInstanceOf(Date)
    }
  })
})
