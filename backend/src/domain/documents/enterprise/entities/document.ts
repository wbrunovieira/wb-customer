import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { DocumentType } from '../value-objects/document-type.vo'
import { DocumentStatus } from '../value-objects/document-status.vo'
import { DocumentUploadedEvent } from '../events/document-uploaded.event'

export interface DocumentProps {
  customerId: string
  type: DocumentType
  title: string
  driveFileId: string
  driveViewUrl: string
  driveDownloadUrl: string
  mimeType: string
  sizeBytes?: number | null
  signedAt?: Date | null
  notes?: string | null
  status: DocumentStatus
  uploadedByUserId: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export class Document extends AggregateRoot<DocumentProps> {
  private constructor(props: DocumentProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<DocumentProps, 'createdAt' | 'updatedAt' | 'deletedAt' | 'status'> & {
      status?: DocumentStatus
    },
    id?: UniqueEntityID,
  ): Document {
    const isNew = !id
    const doc = new Document(
      {
        ...props,
        status: props.status ?? DocumentStatus.createUnsafe('pending_signature'),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      id,
    )

    if (isNew) {
      doc.addDomainEvent(
        new DocumentUploadedEvent(
          doc.id.value,
          props.customerId,
          props.uploadedByUserId,
          props.title,
        ),
      )
    }

    return doc
  }

  static restore(props: DocumentProps, id: UniqueEntityID): Document {
    return new Document(props, id)
  }

  get customerId(): string {
    return this.props.customerId
  }

  get type(): DocumentType {
    return this.props.type
  }

  get title(): string {
    return this.props.title
  }

  get driveFileId(): string {
    return this.props.driveFileId
  }

  get driveViewUrl(): string {
    return this.props.driveViewUrl
  }

  get driveDownloadUrl(): string {
    return this.props.driveDownloadUrl
  }

  get mimeType(): string {
    return this.props.mimeType
  }

  get sizeBytes(): number | null {
    return this.props.sizeBytes ?? null
  }

  get signedAt(): Date | null {
    return this.props.signedAt ?? null
  }

  get notes(): string | null {
    return this.props.notes ?? null
  }

  get status(): DocumentStatus {
    return this.props.status
  }

  get uploadedByUserId(): string {
    return this.props.uploadedByUserId
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

  updateStatus(status: DocumentStatus): void {
    this.props.status = status
    if (status.isSigned()) {
      this.props.signedAt = new Date()
    }
    this.props.updatedAt = new Date()
  }

  softDelete(): void {
    this.props.deletedAt = new Date()
    this.props.updatedAt = new Date()
  }
}
