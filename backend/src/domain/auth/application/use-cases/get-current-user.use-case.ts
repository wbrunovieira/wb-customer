import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IUserIdentityRepository } from '../repositories/i-user-identity.repository'
import { IUserProfileRepository } from '../repositories/i-user-profile.repository'
import { IUserAuthorizationRepository } from '../repositories/i-user-authorization.repository'
import { UserNotFoundError } from '../../domain/exceptions/user-not-found.error'

export interface GetCurrentUserRequest {
  userId: string
}

export interface GetCurrentUserResponse {
  id: string
  email: string
  name: string
  phone: string | null
  avatarUrl: string | null
  role: string
  createdAt: Date
}

export type GetCurrentUserResult = Either<
  UserNotFoundError,
  GetCurrentUserResponse
>

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    private readonly userIdentityRepo: IUserIdentityRepository,
    private readonly userProfileRepo: IUserProfileRepository,
    private readonly userAuthorizationRepo: IUserAuthorizationRepository,
  ) {}

  async execute(
    request: GetCurrentUserRequest,
  ): Promise<GetCurrentUserResult> {
    const identity = await this.userIdentityRepo.findById(request.userId)
    if (!identity) return left(new UserNotFoundError(request.userId))

    const profile = await this.userProfileRepo.findByUserId(request.userId)
    if (!profile) return left(new UserNotFoundError(request.userId))

    const authorization = await this.userAuthorizationRepo.findByUserId(
      request.userId,
    )
    if (!authorization) return left(new UserNotFoundError(request.userId))

    return right({
      id: identity.id.value,
      email: identity.email.value,
      name: profile.name,
      phone: profile.phone,
      avatarUrl: profile.avatarUrl,
      role: authorization.role.value,
      createdAt: identity.createdAt,
    })
  }
}
