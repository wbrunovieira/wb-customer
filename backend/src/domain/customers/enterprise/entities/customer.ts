import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { CustomerStatus } from '../value-objects/customer-status.vo'
import { CustomerCreatedEvent } from '../events/customer-created.event'
import { CustomerUpdatedEvent } from '../events/customer-updated.event'
import { CustomerAssignedEvent } from '../events/customer-assigned.event'

export interface CustomerProps {
  name: string
  email: string
  phone?: string | null
  document?: string | null // CNPJ digits
  website?: string | null
  notes?: string | null
  status: CustomerStatus
  categoryId?: string | null
  driveFolderId?: string | null
  createdByUserId: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export class Customer extends AggregateRoot<CustomerProps> {
  private constructor(props: CustomerProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<CustomerProps, 'createdAt' | 'updatedAt' | 'deletedAt' | 'status'> & {
      status?: CustomerStatus
    },
    id?: UniqueEntityID,
  ): Customer {
    const isNew = !id
    const customer = new Customer(
      {
        ...props,
        status: props.status ?? CustomerStatus.createUnsafe('lead'),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      id,
    )

    if (isNew) {
      customer.addDomainEvent(
        new CustomerCreatedEvent(
          customer.id.value,
          props.name,
          props.createdByUserId,
        ),
      )
    }

    return customer
  }

  static restore(props: CustomerProps, id: UniqueEntityID): Customer {
    return new Customer(props, id)
  }

  get name(): string {
    return this.props.name
  }

  get email(): string {
    return this.props.email
  }

  get phone(): string | null {
    return this.props.phone ?? null
  }

  get document(): string | null {
    return this.props.document ?? null
  }

  get website(): string | null {
    return this.props.website ?? null
  }

  get notes(): string | null {
    return this.props.notes ?? null
  }

  get status(): CustomerStatus {
    return this.props.status
  }

  get categoryId(): string | null {
    return this.props.categoryId ?? null
  }

  get driveFolderId(): string | null {
    return this.props.driveFolderId ?? null
  }

  get createdByUserId(): string {
    return this.props.createdByUserId
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt ?? null
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null && this.props.deletedAt !== undefined
  }

  update(
    fields: Partial<
      Pick<CustomerProps, 'name' | 'email' | 'phone' | 'document' | 'website' | 'notes' | 'status' | 'categoryId'>
    >,
    updatedByUserId: string,
  ): void {
    if (fields.name !== undefined) this.props.name = fields.name
    if (fields.email !== undefined) this.props.email = fields.email
    if (fields.phone !== undefined) this.props.phone = fields.phone
    if (fields.document !== undefined) this.props.document = fields.document
    if (fields.website !== undefined) this.props.website = fields.website
    if (fields.notes !== undefined) this.props.notes = fields.notes
    if (fields.status !== undefined) this.props.status = fields.status
    if (fields.categoryId !== undefined) this.props.categoryId = fields.categoryId
    this.props.updatedAt = new Date()

    this.addDomainEvent(new CustomerUpdatedEvent(this.id.value, updatedByUserId))
  }

  setDriveFolderId(folderId: string): void {
    this.props.driveFolderId = folderId
    this.props.updatedAt = new Date()
  }

  recordEmployeeAssigned(userId: string, assignedBy: string): void {
    this.addDomainEvent(
      new CustomerAssignedEvent(this.id.value, userId, assignedBy),
    )
  }

  softDelete(): void {
    this.props.deletedAt = new Date()
    this.props.updatedAt = new Date()
  }
}
