import { Either, left, right } from '@/core/either'
import { InvalidDocumentStatusError } from '../../domain/exceptions/invalid-document-status.error'

export type DocumentStatusValue = 'pending_signature' | 'signed' | 'expired' | 'cancelled'

const VALID_STATUSES: DocumentStatusValue[] = [
  'pending_signature',
  'signed',
  'expired',
  'cancelled',
]

export class DocumentStatus {
  private readonly _value: DocumentStatusValue

  private constructor(value: DocumentStatusValue) {
    this._value = value
  }

  static create(value: string): Either<InvalidDocumentStatusError, DocumentStatus> {
    if (!VALID_STATUSES.includes(value as DocumentStatusValue)) {
      return left(new InvalidDocumentStatusError(value))
    }
    return right(new DocumentStatus(value as DocumentStatusValue))
  }

  static createUnsafe(value: string): DocumentStatus {
    return new DocumentStatus(value as DocumentStatusValue)
  }

  get value(): DocumentStatusValue {
    return this._value
  }

  isPendingSignature(): boolean {
    return this._value === 'pending_signature'
  }

  isSigned(): boolean {
    return this._value === 'signed'
  }

  equals(other: DocumentStatus): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
