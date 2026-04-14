import { Sprint } from '../../enterprise/entities/sprint'

export abstract class ISprintRepository {
  abstract findById(id: string): Promise<Sprint | null>
  abstract findByCustomerId(customerId: string): Promise<Sprint[]>
  abstract save(sprint: Sprint): Promise<void>
  abstract delete(id: string): Promise<void>
}
