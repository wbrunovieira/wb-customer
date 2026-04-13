import { UserAuthorization } from '../../enterprise/entities/user-authorization'

export abstract class IUserAuthorizationRepository {
  abstract findByUserId(userId: string): Promise<UserAuthorization | null>
  abstract save(userAuthorization: UserAuthorization): Promise<void>
}
