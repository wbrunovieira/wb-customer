import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IAuthUnitOfWork } from '@/domain/auth/application/repositories/i-auth-unit-of-work'
import { IUserIdentityRepository } from '@/domain/auth/application/repositories/i-user-identity.repository'
import { IUserProfileRepository } from '@/domain/auth/application/repositories/i-user-profile.repository'
import { IUserAuthorizationRepository } from '@/domain/auth/application/repositories/i-user-authorization.repository'
import { ICustomerUserRepository } from '../repositories/i-customer-user.repository'
import { Email } from '@/domain/auth/enterprise/value-objects/email.vo'
import { Password } from '@/domain/auth/enterprise/value-objects/password.vo'
import { UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'
import { UserIdentity } from '@/domain/auth/enterprise/entities/user-identity'
import { UserProfile } from '@/domain/auth/enterprise/entities/user-profile'
import { UserAuthorization } from '@/domain/auth/enterprise/entities/user-authorization'
import { CustomerUser } from '../../enterprise/entities/customer-user'
import { CustomerUserAlreadyExistsError } from '../../domain/exceptions/customer-user-already-exists.error'
import { ForbiddenPortalActionError } from '../../domain/exceptions/forbidden-portal-action.error'
import { UserAlreadyExistsError } from '@/domain/auth/domain/exceptions/user-already-exists.error'

export interface CreateCustomerSubUserRequest {
  customerId: string
  requesterUserId: string
  email: string
  password: string
  name: string
  phone?: string
}

export type CreateCustomerSubUserResult = Either<
  CustomerUserAlreadyExistsError | ForbiddenPortalActionError | UserAlreadyExistsError,
  { userId: string; customerUserId: string }
>

@Injectable()
export class CreateCustomerSubUserUseCase {
  constructor(
    private readonly customerUserRepo: ICustomerUserRepository,
    private readonly userIdentityRepo: IUserIdentityRepository,
    private readonly userProfileRepo: IUserProfileRepository,
    private readonly userAuthorizationRepo: IUserAuthorizationRepository,
    private readonly unitOfWork: IAuthUnitOfWork,
  ) {}

  async execute(request: CreateCustomerSubUserRequest): Promise<CreateCustomerSubUserResult> {
    // Verify requester is a master of this company
    const requesterCu = await this.customerUserRepo.findByUserId(request.requesterUserId)
    if (!requesterCu || requesterCu.customerId !== request.customerId || !requesterCu.isMaster) {
      return left(new ForbiddenPortalActionError('Only a master user can create sub-users'))
    }

    const emailOrError = Email.create(request.email)
    if (emailOrError.isLeft()) return left(new CustomerUserAlreadyExistsError(request.email))

    const existingIdentity = await this.userIdentityRepo.findByEmail(emailOrError.value)
    if (existingIdentity) return left(new UserAlreadyExistsError(request.email))

    const passwordOrError = Password.create(request.password)
    if (passwordOrError.isLeft()) return left(new CustomerUserAlreadyExistsError(request.email))

    const roleOrError = UserRole.create('customer')
    if (roleOrError.isLeft()) return left(new CustomerUserAlreadyExistsError(request.email))

    const passwordHash = await passwordOrError.value.getHash()

    const identity = UserIdentity.create({ email: emailOrError.value, passwordHash })
    const profile = UserProfile.create({ userId: identity.id.value, name: request.name, phone: request.phone })
    const authorization = UserAuthorization.create({ userId: identity.id.value, role: roleOrError.value })

    const customerUser = CustomerUser.create({
      userId: identity.id.value,
      customerId: request.customerId,
      customerRole: 'member',
      createdBy: request.requesterUserId,
    })

    await this.unitOfWork.execute(async () => {
      await this.userIdentityRepo.save(identity)
      await this.userProfileRepo.save(profile)
      await this.userAuthorizationRepo.save(authorization)
    })
    await this.customerUserRepo.save(customerUser)

    return right({ userId: identity.id.value, customerUserId: customerUser.id.value })
  }
}
