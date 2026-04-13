import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IAuthUnitOfWork } from '../repositories/i-auth-unit-of-work'
import { IUserIdentityRepository } from '../repositories/i-user-identity.repository'
import { IUserProfileRepository } from '../repositories/i-user-profile.repository'
import { IUserAuthorizationRepository } from '../repositories/i-user-authorization.repository'
import { Email } from '../../enterprise/value-objects/email.vo'
import { Password } from '../../enterprise/value-objects/password.vo'
import { UserRole } from '../../enterprise/value-objects/user-role.vo'
import { UserIdentity } from '../../enterprise/entities/user-identity'
import { UserProfile } from '../../enterprise/entities/user-profile'
import { UserAuthorization } from '../../enterprise/entities/user-authorization'
import { InvalidEmailError } from '../../domain/exceptions/invalid-email.error'
import { WeakPasswordError } from '../../domain/exceptions/weak-password.error'
import { InvalidRoleError } from '../../domain/exceptions/invalid-role.error'
import { UserAlreadyExistsError } from '../../domain/exceptions/user-already-exists.error'

export interface CreateUserRequest {
  email: string
  password: string
  name: string
  phone?: string
  role: string
}

export interface CreateUserResponse {
  userId: string
}

export type CreateUserResult = Either<
  | InvalidEmailError
  | WeakPasswordError
  | InvalidRoleError
  | UserAlreadyExistsError,
  CreateUserResponse
>

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly userIdentityRepo: IUserIdentityRepository,
    private readonly userProfileRepo: IUserProfileRepository,
    private readonly userAuthorizationRepo: IUserAuthorizationRepository,
    private readonly unitOfWork: IAuthUnitOfWork,
  ) {}

  async execute(request: CreateUserRequest): Promise<CreateUserResult> {
    const emailOrError = Email.create(request.email)
    if (emailOrError.isLeft()) return left(emailOrError.value)

    const passwordOrError = Password.create(request.password)
    if (passwordOrError.isLeft()) return left(passwordOrError.value)

    const roleOrError = UserRole.create(request.role)
    if (roleOrError.isLeft()) return left(roleOrError.value)

    const existing = await this.userIdentityRepo.findByEmail(emailOrError.value)
    if (existing) return left(new UserAlreadyExistsError(request.email))

    const passwordHash = await passwordOrError.value.getHash()

    const userIdentity = UserIdentity.create({
      email: emailOrError.value,
      passwordHash,
    })

    const userProfile = UserProfile.create({
      userId: userIdentity.id.value,
      name: request.name,
      phone: request.phone,
    })

    const userAuthorization = UserAuthorization.create({
      userId: userIdentity.id.value,
      role: roleOrError.value,
    })

    await this.unitOfWork.execute(async () => {
      await this.userIdentityRepo.save(userIdentity)
      await this.userProfileRepo.save(userProfile)
      await this.userAuthorizationRepo.save(userAuthorization)
    })

    return right({ userId: userIdentity.id.value })
  }
}
