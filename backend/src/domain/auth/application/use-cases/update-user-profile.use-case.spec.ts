import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateUserProfileUseCase } from './update-user-profile.use-case'
import { CreateUserUseCase } from './create-user.use-case'
import { InMemoryUserIdentityRepository } from '@/test/repositories/auth/in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/auth/in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/auth/in-memory-user-authorization.repository'
import { InMemoryAuthUnitOfWork } from '@/test/repositories/auth/in-memory-auth-unit-of-work'
import { UserNotFoundError } from '../../domain/exceptions/user-not-found.error'

let profileRepo: InMemoryUserProfileRepository
let sut: UpdateUserProfileUseCase
let userId: string

beforeEach(async () => {
  const identityRepo = new InMemoryUserIdentityRepository()
  profileRepo = new InMemoryUserProfileRepository()
  const authorizationRepo = new InMemoryUserAuthorizationRepository()

  const createUser = new CreateUserUseCase(
    identityRepo,
    profileRepo,
    authorizationRepo,
    new InMemoryAuthUnitOfWork(),
  )

  const result = await createUser.execute({
    email: 'user@example.com',
    password: 'Password123@',
    name: 'Original Name',
    phone: '+5511111111111',
    role: 'employee',
  })

  if (result.isRight()) userId = result.value.userId

  sut = new UpdateUserProfileUseCase(profileRepo)
})

describe('UpdateUserProfileUseCase', () => {
  it('should update the user name', async () => {
    const result = await sut.execute({ userId, name: 'Updated Name' })

    expect(result.isRight()).toBe(true)
    expect(profileRepo.items[0].name).toBe('Updated Name')
  })

  it('should update the phone', async () => {
    const result = await sut.execute({ userId, phone: '+5599999999999' })

    expect(result.isRight()).toBe(true)
    expect(profileRepo.items[0].phone).toBe('+5599999999999')
  })

  it('should clear phone when set to null', async () => {
    const result = await sut.execute({ userId, phone: null })

    expect(result.isRight()).toBe(true)
    expect(profileRepo.items[0].phone).toBeNull()
  })

  it('should update avatarUrl', async () => {
    const result = await sut.execute({
      userId,
      avatarUrl: 'https://example.com/avatar.jpg',
    })

    expect(result.isRight()).toBe(true)
    expect(profileRepo.items[0].avatarUrl).toBe(
      'https://example.com/avatar.jpg',
    )
  })

  it('should update updatedAt after update', async () => {
    const before = profileRepo.items[0].updatedAt
    await sut.execute({ userId, name: 'Changed' })
    expect(profileRepo.items[0].updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    )
  })

  it('should return UserNotFoundError for non-existent userId', async () => {
    const result = await sut.execute({
      userId: 'non-existent',
      name: 'New Name',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(UserNotFoundError)
    }
  })
})
