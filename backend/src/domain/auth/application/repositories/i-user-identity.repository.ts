import { UserIdentity } from '../../enterprise/entities/user-identity'
import { Email } from '../../enterprise/value-objects/email.vo'

export abstract class IUserIdentityRepository {
  abstract findById(id: string): Promise<UserIdentity | null>
  abstract findByEmail(email: Email): Promise<UserIdentity | null>
  abstract findAll(): Promise<UserIdentity[]>
  abstract save(userIdentity: UserIdentity): Promise<void>
}
