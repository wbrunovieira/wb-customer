import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerUserRepository } from '../repositories/i-customer-user.repository'
import { ICustomerRepository } from '../repositories/i-customer.repository'
import { IUserProfileRepository } from '@/domain/auth/application/repositories/i-user-profile.repository'
import { CustomerUser } from '../../enterprise/entities/customer-user'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'

export interface PortalUserItem {
  customerUserId: string
  userId: string
  customerRole: string
  name: string
  phone: string | null
  createdAt: Date
  deletedAt: Date | null
}

export type ListCustomerPortalUsersResult = Either<
  CustomerNotFoundError,
  { users: PortalUserItem[] }
>

@Injectable()
export class ListCustomerPortalUsersUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly customerUserRepo: ICustomerUserRepository,
    private readonly userProfileRepo: IUserProfileRepository,
  ) {}

  async execute(customerId: string): Promise<ListCustomerPortalUsersResult> {
    const customer = await this.customerRepo.findById(customerId)
    if (!customer) return left(new CustomerNotFoundError(customerId))

    const customerUsers = await this.customerUserRepo.findByCustomerId(customerId)

    const items: PortalUserItem[] = await Promise.all(
      customerUsers.map(async (cu: CustomerUser) => {
        const profile = await this.userProfileRepo.findByUserId(cu.userId)
        return {
          customerUserId: cu.id.value,
          userId: cu.userId,
          customerRole: cu.customerRole,
          name: profile?.name ?? '—',
          phone: profile?.phone ?? null,
          createdAt: cu.createdAt,
          deletedAt: cu.deletedAt,
        }
      }),
    )

    return right({ users: items })
  }
}
