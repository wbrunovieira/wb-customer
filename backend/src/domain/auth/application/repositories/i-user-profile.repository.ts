import { UserProfile } from '../../enterprise/entities/user-profile'

export abstract class IUserProfileRepository {
  abstract findByUserId(userId: string): Promise<UserProfile | null>
  abstract findById(id: string): Promise<UserProfile | null>
  abstract save(userProfile: UserProfile): Promise<void>
}
