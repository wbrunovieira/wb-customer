import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerUserRepository } from '../repositories/i-customer-user.repository'
import { IUserProfileRepository } from '@/domain/auth/application/repositories/i-user-profile.repository'
import { CustomerUserRole } from '../../enterprise/entities/customer-user'
import { CustomerUserNotFoundError } from '../../domain/exceptions/customer-user-not-found.error'

export interface UpdateCustomerPortalUserRequest {
  customerUserId: string
  name?: string
  phone?: string | null
  customerRole?: CustomerUserRole
}

export type UpdateCustomerPortalUserResult = Either<CustomerUserNotFoundError, void>

@Injectable()
export class UpdateCustomerPortalUserUseCase {
  constructor(
    private readonly customerUserRepo: ICustomerUserRepository,
    private readonly profileRepo: IUserProfileRepository,
  ) {}

  async execute(request: UpdateCustomerPortalUserRequest): Promise<UpdateCustomerPortalUserResult> {
    const customerUser = await this.customerUserRepo.findById(request.customerUserId)
    if (!customerUser) return left(new CustomerUserNotFoundError(request.customerUserId))

    if (request.customerRole !== undefined) {
      customerUser.updateRole(request.customerRole)
      await this.customerUserRepo.save(customerUser)
    }

    if (request.name !== undefined || request.phone !== undefined) {
      const profile = await this.profileRepo.findByUserId(customerUser.userId)
      if (profile) {
        profile.update({ name: request.name, phone: request.phone })
        await this.profileRepo.save(profile)
      }
    }

    return right(undefined)
  }
}
