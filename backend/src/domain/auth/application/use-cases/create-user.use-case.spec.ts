import { describe, it, expect, beforeEach } from 'vitest'
import { CreateUserUseCase } from './create-user.use-case'
import { InMemoryUserIdentityRepository } from '@/test/repositories/auth/in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/auth/in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/auth/in-memory-user-authorization.repository'
import { InMemoryAuthUnitOfWork } from '@/test/repositories/auth/in-memory-auth-unit-of-work'
import { UserAlreadyExistsError } from '../../domain/exceptions/user-already-exists.error'
import { InvalidEmailError } from '../../domain/exceptions/invalid-email.error'
import { WeakPasswordError } from '../../domain/exceptions/weak-password.error'
import { InvalidRoleError } from '../../domain/exceptions/invalid-role.error'

let identityRepo: InMemoryUserIdentityRepository
let profileRepo: InMemoryUserProfileRepository
let authorizationRepo: InMemoryUserAuthorizationRepository
let unitOfWork: InMemoryAuthUnitOfWork
let sut: CreateUserUseCase

beforeEach(() => {
  identityRepo = new InMemoryUserIdentityRepository()
  profileRepo = new InMemoryUserProfileRepository()
  authorizationRepo = new InMemoryUserAuthorizationRepository()
  unitOfWork = new InMemoryAuthUnitOfWork()
  sut = new CreateUserUseCase(
    identityRepo,
    profileRepo,
    authorizationRepo,
    unitOfWork,
  )
})

describe('CreateUserUseCase', () => {
  it('should create a user successfully', async () => {
    const result = await sut.execute({
      email: 'bruno@example.com',
      password: 'SecurePass123@',
      name: 'Bruno Vieira',
      role: 'admin',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.userId).toBeDefined()
    }
    expect(identityRepo.items).toHaveLength(1)
    expect(profileRepo.items).toHaveLength(1)
    expect(authorizationRepo.items).toHaveLength(1)
  })

  it('should persist identity with hashed password', async () => {
    await sut.execute({
      email: 'user@example.com',
      password: 'PlainPassword123',
      name: 'User',
      role: 'employee',
    })

    const identity = identityRepo.items[0]
    expect(identity.passwordHash).not.toBe('PlainPassword123')
    expect(identity.passwordHash).toMatch(/^\$2[ab]\$/)
  })

  it('should persist profile with correct name and phone', async () => {
    await sut.execute({
      email: 'user@example.com',
      password: 'Password123@',
      name: 'Maria Silva',
      phone: '+5511999999999',
      role: 'employee',
    })

    const profile = profileRepo.items[0]
    expect(profile.name).toBe('Maria Silva')
    expect(profile.phone).toBe('+5511999999999')
  })

  it('should persist authorization with the given role', async () => {
    await sut.execute({
      email: 'manager@example.com',
      password: 'Password123@',
      name: 'Manager',
      role: 'manager',
    })

    const auth = authorizationRepo.items[0]
    expect(auth.role.value).toBe('manager')
  })

  it('should return UserAlreadyExistsError for duplicate email', async () => {
    await sut.execute({
      email: 'duplicate@example.com',
      password: 'Password123@',
      name: 'First',
      role: 'employee',
    })

    const result = await sut.execute({
      email: 'duplicate@example.com',
      password: 'Password456@',
      name: 'Second',
      role: 'employee',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(UserAlreadyExistsError)
    }
    expect(identityRepo.items).toHaveLength(1)
  })

  it('should return InvalidEmailError for bad email', async () => {
    const result = await sut.execute({
      email: 'not-an-email',
      password: 'Password123@',
      name: 'User',
      role: 'employee',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidEmailError)
    }
  })

  it('should return WeakPasswordError for short password', async () => {
    const result = await sut.execute({
      email: 'user@example.com',
      password: 'short',
      name: 'User',
      role: 'employee',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(WeakPasswordError)
    }
  })

  it('should return InvalidRoleError for unknown role', async () => {
    const result = await sut.execute({
      email: 'user@example.com',
      password: 'Password123@',
      name: 'User',
      role: 'superadmin',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidRoleError)
    }
  })
})
