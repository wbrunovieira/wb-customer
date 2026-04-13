import { describe, it, expect, beforeEach } from 'vitest'
import { CreateCustomerSubUserUseCase } from './create-customer-sub-user.use-case'
import { InMemoryCustomerUserRepository } from '@/test/repositories/customers/in-memory-customer-user.repository'
import { InMemoryUserIdentityRepository } from '@/test/repositories/auth/in-memory-user-identity.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/auth/in-memory-user-profile.repository'
import { InMemoryUserAuthorizationRepository } from '@/test/repositories/auth/in-memory-user-authorization.repository'
import { InMemoryAuthUnitOfWork } from '@/test/repositories/auth/in-memory-auth-unit-of-work'
import { CustomerUser } from '../../enterprise/entities/customer-user'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { ForbiddenPortalActionError } from '../../domain/exceptions/forbidden-portal-action.error'
import { UserAlreadyExistsError } from '@/domain/auth/domain/exceptions/user-already-exists.error'

let customerUserRepo: InMemoryCustomerUserRepository
let identityRepo: InMemoryUserIdentityRepository
let profileRepo: InMemoryUserProfileRepository
let authorizationRepo: InMemoryUserAuthorizationRepository
let sut: CreateCustomerSubUserUseCase

const customerId = 'customer-1'
const masterUserId = 'master-user-1'

beforeEach(() => {
  customerUserRepo = new InMemoryCustomerUserRepository()
  identityRepo = new InMemoryUserIdentityRepository()
  profileRepo = new InMemoryUserProfileRepository()
  authorizationRepo = new InMemoryUserAuthorizationRepository()

  sut = new CreateCustomerSubUserUseCase(
    customerUserRepo,
    identityRepo,
    profileRepo,
    authorizationRepo,
    new InMemoryAuthUnitOfWork(),
  )

  // Seed a master user for the customer
  customerUserRepo.items.push(
    CustomerUser.create(
      { userId: masterUserId, customerId, customerRole: 'master', createdBy: 'admin-1' },
      new UniqueEntityID('cu-master'),
    ),
  )
})

describe('CreateCustomerSubUserUseCase', () => {
  it('should create a member sub-user when called by master', async () => {
    const result = await sut.execute({
      customerId,
      requesterUserId: masterUserId,
      email: 'member@acme.com',
      password: 'Temp@1234',
      name: 'Member User',
    })

    expect(result.isRight()).toBe(true)
    expect(customerUserRepo.items).toHaveLength(2)
    expect(customerUserRepo.items[1].customerRole).toBe('member')
    expect(authorizationRepo.items[0].role.value).toBe('customer')
  })

  it('should return ForbiddenPortalActionError when called by a member', async () => {
    const memberUserId = 'member-user-1'
    customerUserRepo.items.push(
      CustomerUser.create(
        { userId: memberUserId, customerId, customerRole: 'member', createdBy: masterUserId },
        new UniqueEntityID('cu-member'),
      ),
    )

    const result = await sut.execute({
      customerId,
      requesterUserId: memberUserId,
      email: 'another@acme.com',
      password: 'Temp@1234',
      name: 'Another',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ForbiddenPortalActionError)
  })

  it('should return ForbiddenPortalActionError when master belongs to different company', async () => {
    const otherMasterId = 'other-master'
    customerUserRepo.items.push(
      CustomerUser.create(
        { userId: otherMasterId, customerId: 'other-company', customerRole: 'master', createdBy: 'admin' },
        new UniqueEntityID('cu-other'),
      ),
    )

    const result = await sut.execute({
      customerId,
      requesterUserId: otherMasterId,
      email: 'hacker@acme.com',
      password: 'Temp@1234',
      name: 'Hacker',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ForbiddenPortalActionError)
  })

  it('should return UserAlreadyExistsError for duplicate email', async () => {
    await sut.execute({
      customerId,
      requesterUserId: masterUserId,
      email: 'member@acme.com',
      password: 'Temp@1234',
      name: 'First',
    })

    const result = await sut.execute({
      customerId,
      requesterUserId: masterUserId,
      email: 'member@acme.com',
      password: 'Temp@1234',
      name: 'Second',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserAlreadyExistsError)
  })
})
