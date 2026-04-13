import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IUserProfileRepository } from '../repositories/i-user-profile.repository'
import { UserNotFoundError } from '../../domain/exceptions/user-not-found.error'

export interface UpdateUserProfileRequest {
  userId: string
  name?: string
  phone?: string | null
  avatarUrl?: string | null
}

export type UpdateUserProfileResult = Either<UserNotFoundError, void>

@Injectable()
export class UpdateUserProfileUseCase {
  constructor(private readonly userProfileRepo: IUserProfileRepository) {}

  async execute(
    request: UpdateUserProfileRequest,
  ): Promise<UpdateUserProfileResult> {
    const profile = await this.userProfileRepo.findByUserId(request.userId)
    if (!profile) return left(new UserNotFoundError(request.userId))

    profile.update({
      name: request.name,
      phone: request.phone,
      avatarUrl: request.avatarUrl,
    })

    await this.userProfileRepo.save(profile)

    return right(undefined)
  }
}
