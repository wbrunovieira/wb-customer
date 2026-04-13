import { UniqueEntityID } from './unique-entity-id'

export abstract class Entity<Props> {
  protected readonly _id: UniqueEntityID
  protected props: Props

  protected constructor(props: Props, id?: UniqueEntityID) {
    this._id = id ?? new UniqueEntityID()
    this.props = props
  }

  get id(): UniqueEntityID {
    return this._id
  }

  equals(entity?: Entity<unknown> | null): boolean {
    if (entity === null || entity === undefined) return false
    if (this === entity) return true
    if (!(entity instanceof Entity)) return false
    return this._id.equals(entity._id)
  }
}
