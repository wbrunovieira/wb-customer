import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface MeetingTypeProps {
  name: string
  description?: string | null
  durationMinutes: number
  color: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export class MeetingType extends AggregateRoot<MeetingTypeProps> {
  private constructor(props: MeetingTypeProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<MeetingTypeProps, 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'color' | 'durationMinutes'> & {
      durationMinutes?: number
      color?: string
      isActive?: boolean
    },
    id?: UniqueEntityID,
  ): MeetingType {
    return new MeetingType(
      {
        ...props,
        durationMinutes: props.durationMinutes ?? 60,
        color: props.color ?? '#3B82F6',
        isActive: props.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      id,
    )
  }

  static restore(props: MeetingTypeProps, id: UniqueEntityID): MeetingType {
    return new MeetingType(props, id)
  }

  get name(): string { return this.props.name }
  get description(): string | null { return this.props.description ?? null }
  get durationMinutes(): number { return this.props.durationMinutes }
  get color(): string { return this.props.color }
  get isActive(): boolean { return this.props.isActive }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get deletedAt(): Date | null { return this.props.deletedAt ?? null }
  get isDeleted(): boolean { return !!this.props.deletedAt }

  update(fields: Partial<Pick<MeetingTypeProps, 'name' | 'description' | 'durationMinutes' | 'color' | 'isActive'>>): void {
    if (fields.name !== undefined) this.props.name = fields.name
    if (fields.description !== undefined) this.props.description = fields.description
    if (fields.durationMinutes !== undefined) this.props.durationMinutes = fields.durationMinutes
    if (fields.color !== undefined) this.props.color = fields.color
    if (fields.isActive !== undefined) this.props.isActive = fields.isActive
    this.props.updatedAt = new Date()
  }

  softDelete(): void {
    this.props.deletedAt = new Date()
    this.props.updatedAt = new Date()
  }
}
