import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateCustomerPortalUserUseCase } from './update-customer-portal-user.use-case'
import { InMemoryCustomerUserRepository } from '@/test/repositories/customers/in-memory-customer-user.repository'
import { InMemoryUserProfileRepository } from '@/test/repositories/auth/in-memory-user-profile.repository'
import { CustomerUser } from '../../enterprise/entities/customer-user'
import { UserProfile } from '@/domain/auth/enterprise/entities/user-profile'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { CustomerUserNotFoundError } from '../../domain/exceptions/customer-user-not-found.error'

let customerUserRepo: InMemoryCustomerUserRepository
let profileRepo: InMemoryUserProfileRepository
let sut: UpdateCustomerPortalUserUseCase

const customerUserId = 'cu-1'
const userId = 'user-1'

beforeEach(() => {
  customerUserRepo = new InMemoryCustomerUserRepository()
  profileRepo = new InMemoryUserProfileRepository()
  sut = new UpdateCustomerPortalUserUseCase(customerUserRepo, profileRepo)

  customerUserRepo.items.push(
    CustomerUser.restore(
      {
        userId,
        customerId: 'customer-1',
        customerRole: 'master',
        createdBy: 'admin-1',
        createdAt: new Date(),
        deletedAt: null,
      },
      new UniqueEntityID(customerUserId),
    ),
  )

  profileRepo.items.push(
    UserProfile.create({ userId, name: 'João Silva', phone: '+5511999999999' }),
  )
})

describe('UpdateCustomerPortalUserUseCase', () => {
  it('should update name and phone', async () => {
    const result = await sut.execute({
      customerUserId,
      name: 'João Santos',
      phone: '+5511888888888',
    })

    expect(result.isRight()).toBe(true)
    const profile = profileRepo.items.find((p) => p.userId === userId)
    expect(profile?.name).toBe('João Santos')
    expect(profile?.phone).toBe('+5511888888888')
  })

  it('should update customerRole', async () => {
    const result = await sut.execute({
      customerUserId,
      customerRole: 'member',
    })

    expect(result.isRight()).toBe(true)
    const cu = customerUserRepo.items.find((cu) => cu.id.value === customerUserId)
    expect(cu?.customerRole).toBe('member')
  })

  it('should update all fields at once', async () => {
    const result = await sut.execute({
      customerUserId,
      name: 'Maria Silva',
      phone: '+5511777777777',
      customerRole: 'member',
    })

    expect(result.isRight()).toBe(true)
    const cu = customerUserRepo.items.find((cu) => cu.id.value === customerUserId)
    const profile = profileRepo.items.find((p) => p.userId === userId)
    expect(cu?.customerRole).toBe('member')
    expect(profile?.name).toBe('Maria Silva')
  })

  it('should return error for non-existent customerUserId', async () => {
    const result = await sut.execute({
      customerUserId: 'non-existent',
      name: 'New Name',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CustomerUserNotFoundError)
  })

  it('should not update role if not provided', async () => {
    const result = await sut.execute({
      customerUserId,
      name: 'Only Name Changed',
    })

    expect(result.isRight()).toBe(true)
    const cu = customerUserRepo.items.find((cu) => cu.id.value === customerUserId)
    expect(cu?.customerRole).toBe('master') // unchanged
  })

  it('should not update profile if name/phone not provided', async () => {
    const result = await sut.execute({
      customerUserId,
      customerRole: 'member',
    })

    expect(result.isRight()).toBe(true)
    const profile = profileRepo.items.find((p) => p.userId === userId)
    expect(profile?.name).toBe('João Silva') // unchanged
    expect(profile?.phone).toBe('+5511999999999') // unchanged
  })
})
