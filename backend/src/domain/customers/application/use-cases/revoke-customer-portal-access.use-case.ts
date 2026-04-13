import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerUserRepository } from '../repositories/i-customer-user.repository'
import { CustomerUserNotFoundError } from '../../domain/exceptions/customer-user-not-found.error'

export type RevokeCustomerPortalAccessResult = Either<CustomerUserNotFoundError, void>

@Injectable()
export class RevokeCustomerPortalAccessUseCase {
  constructor(private readonly customerUserRepo: ICustomerUserRepository) {}

  async execute(customerUserId: string): Promise<RevokeCustomerPortalAccessResult> {
    const customerUser = await this.customerUserRepo.findById(customerUserId)
    if (!customerUser || customerUser.isDeleted) {
      return left(new CustomerUserNotFoundError(customerUserId))
    }

    customerUser.softDelete()
    await this.customerUserRepo.save(customerUser)
    return right(undefined)
  }
}
