import { describe, it, expect, beforeEach } from 'vitest'
import { CreateCustomerPortalUserUseCase } from './create-customer-portal-user.use-case'
import { InMemoryCustomerRepository } from '@/test/repositories/customers/in-memory-customer.repository'
import { InMemoryCustomerUserRepository } from '@/test/repositories/customers/in-memory-customer-user.repository'
import { InMemoryUserIdentityRepository } from '@/test/repositories/auth/in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/auth/in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/auth/in-memory-user-authorization.repository'
import { InMemoryAuthUnitOfWork } from '@/test/repositories/auth/in-memory-auth-unit-of-work'
import { Customer } from '@/domain/customers/enterprise/entities/customer'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'
import { UserAlreadyExistsError } from '@/domain/auth/domain/exceptions/user-already-exists.error'

let customerRepo: InMemoryCustomerRepository
let customerUserRepo: InMemoryCustomerUserRepository
let identityRepo: InMemoryUserIdentityRepository
let profileRepo: InMemoryUserProfileRepository
let authorizationRepo: InMemoryUserAuthorizationRepository
let sut: CreateCustomerPortalUserUseCase

const customerId = 'customer-1'

beforeEach(() => {
  customerRepo = new InMemoryCustomerRepository()
  customerUserRepo = new InMemoryCustomerUserRepository()
  identityRepo = new InMemoryUserIdentityRepository()
  profileRepo = new InMemoryUserProfileRepository()
  authorizationRepo = new InMemoryUserAuthorizationRepository()

  sut = new CreateCustomerPortalUserUseCase(
    customerRepo,
    customerUserRepo,
    identityRepo,
    profileRepo,
    authorizationRepo,
    new InMemoryAuthUnitOfWork(),
  )

  customerRepo.items.push(
    Customer.create(
      { name: 'Acme Corp', email: 'acme@test.com', createdByUserId: 'admin-1' },
      new UniqueEntityID(customerId),
    ),
  )
})

describe('CreateCustomerPortalUserUseCase', () => {
  it('should create a master portal user successfully', async () => {
    const result = await sut.execute({
      customerId,
      email: 'master@acme.com',
      password: 'Temp@1234',
      name: 'Master User',
      customerRole: 'master',
      createdByUserId: 'admin-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.userId).toBeDefined()
      expect(result.value.customerUserId).toBeDefined()
    }
    expect(customerUserRepo.items).toHaveLength(1)
    expect(customerUserRepo.items[0].isMaster).toBe(true)
    expect(identityRepo.items).toHaveLength(1)
    expect(authorizationRepo.items[0].role.value).toBe('customer')
  })

  it('should return CustomerNotFoundError for unknown customer', async () => {
    const result = await sut.execute({
      customerId: 'unknown',
      email: 'user@test.com',
      password: 'Temp@1234',
      name: 'Test',
      createdByUserId: 'admin-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CustomerNotFoundError)
  })

  it('should return UserAlreadyExistsError for duplicate email', async () => {
    await sut.execute({
      customerId,
      email: 'master@acme.com',
      password: 'Temp@1234',
      name: 'First',
      createdByUserId: 'admin-1',
    })

    const result = await sut.execute({
      customerId,
      email: 'master@acme.com',
      password: 'Temp@1234',
      name: 'Second',
      createdByUserId: 'admin-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserAlreadyExistsError)
  })

  it('should default to master role when customerRole not specified', async () => {
    await sut.execute({
      customerId,
      email: 'user@acme.com',
      password: 'Temp@1234',
      name: 'User',
      createdByUserId: 'admin-1',
    })

    expect(customerUserRepo.items[0].customerRole).toBe('master')
  })
})
