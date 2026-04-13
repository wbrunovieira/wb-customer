import { describe, it, expect, beforeEach } from 'vitest'
import { ListUsersUseCase } from './list-users.use-case'
import { CreateUserUseCase } from './create-user.use-case'
import { InMemoryUserIdentityRepository } from '@/test/repositories/auth/in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/auth/in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/auth/in-memory-user-authorization.repository'
import { InMemoryAuthUnitOfWork } from '@/test/repositories/auth/in-memory-auth-unit-of-work'

let identityRepo: InMemoryUserIdentityRepository
let profileRepo: InMemoryUserProfileRepository
let authorizationRepo: InMemoryUserAuthorizationRepository
let createUser: CreateUserUseCase
let sut: ListUsersUseCase

beforeEach(() => {
  identityRepo = new InMemoryUserIdentityRepository()
  profileRepo = new InMemoryUserProfileRepository()
  authorizationRepo = new InMemoryUserAuthorizationRepository()

  createUser = new CreateUserUseCase(
    identityRepo,
    profileRepo,
    authorizationRepo,
    new InMemoryAuthUnitOfWork(),
  )

  sut = new ListUsersUseCase(identityRepo, profileRepo, authorizationRepo)
})

describe('ListUsersUseCase', () => {
  it('should return empty list when there are no users', async () => {
    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.users).toHaveLength(0)
      expect(result.value.total).toBe(0)
    }
  })

  it('should return all users', async () => {
    await createUser.execute({
      email: 'user1@example.com',
      password: 'Password123@',
      name: 'User One',
      role: 'admin',
    })
    await createUser.execute({
      email: 'user2@example.com',
      password: 'Password123@',
      name: 'User Two',
      role: 'employee',
    })

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.users).toHaveLength(2)
      expect(result.value.total).toBe(2)
    }
  })

  it('should paginate results', async () => {
    for (let i = 1; i <= 5; i++) {
      await createUser.execute({
        email: `user${i}@example.com`,
        password: 'Password123@',
        name: `User ${i}`,
        role: 'employee',
      })
    }

    const result = await sut.execute({ page: 1, limit: 2 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.users).toHaveLength(2)
      expect(result.value.total).toBe(5)
      expect(result.value.pages).toBe(3)
      expect(result.value.page).toBe(1)
    }
  })

  it('should return correct page on page 2', async () => {
    for (let i = 1; i <= 5; i++) {
      await createUser.execute({
        email: `user${i}@example.com`,
        password: 'Password123@',
        name: `User ${i}`,
        role: 'employee',
      })
    }

    const result = await sut.execute({ page: 2, limit: 2 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.users).toHaveLength(2)
      expect(result.value.page).toBe(2)
    }
  })
})
