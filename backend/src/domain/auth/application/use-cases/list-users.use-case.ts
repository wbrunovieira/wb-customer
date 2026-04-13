import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { IUserIdentityRepository } from '../repositories/i-user-identity.repository'
import { IUserProfileRepository } from '../repositories/i-user-profile.repository'
import { IUserAuthorizationRepository } from '../repositories/i-user-authorization.repository'
import { GetCurrentUserResponse } from './get-current-user.use-case'

export interface ListUsersRequest {
  page?: number
  limit?: number
}

export interface ListUsersResponse {
  users: GetCurrentUserResponse[]
  total: number
  page: number
  pages: number
}

export type ListUsersResult = Either<never, ListUsersResponse>

@Injectable()
export class ListUsersUseCase {
  constructor(
    private readonly userIdentityRepo: IUserIdentityRepository,
    private readonly userProfileRepo: IUserProfileRepository,
    private readonly userAuthorizationRepo: IUserAuthorizationRepository,
  ) {}

  async execute(request: ListUsersRequest = {}): Promise<ListUsersResult> {
    const page = request.page ?? 1
    const limit = request.limit ?? 20

    const allIdentities = await this.userIdentityRepo.findAll()

    const usersData = await Promise.all(
      allIdentities.map(async (identity) => {
        const profile = await this.userProfileRepo.findByUserId(
          identity.id.value,
        )
        const authorization = await this.userAuthorizationRepo.findByUserId(
          identity.id.value,
        )
        if (!profile || !authorization) return null

        return {
          id: identity.id.value,
          email: identity.email.value,
          name: profile.name,
          phone: profile.phone,
          avatarUrl: profile.avatarUrl,
          role: authorization.role.value,
          createdAt: identity.createdAt,
        } as GetCurrentUserResponse
      }),
    )

    const users = usersData.filter(
      (u): u is GetCurrentUserResponse => u !== null,
    )

    const total = users.length
    const start = (page - 1) * limit
    const paginated = users.slice(start, start + limit)

    return right({
      users: paginated,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  }
}
