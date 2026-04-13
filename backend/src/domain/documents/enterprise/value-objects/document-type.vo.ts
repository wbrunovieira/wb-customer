import { Either, left, right } from '@/core/either'
import { InvalidDocumentTypeError } from '../../domain/exceptions/invalid-document-type.error'

export type DocumentTypeValue = 'proposal' | 'contract' | 'addendum' | 'other'

const VALID_TYPES: DocumentTypeValue[] = ['proposal', 'contract', 'addendum', 'other']

export class DocumentType {
  private readonly _value: DocumentTypeValue

  private constructor(value: DocumentTypeValue) {
    this._value = value
  }

  static create(value: string): Either<InvalidDocumentTypeError, DocumentType> {
    if (!VALID_TYPES.includes(value as DocumentTypeValue)) {
      return left(new InvalidDocumentTypeError(value))
    }
    return right(new DocumentType(value as DocumentTypeValue))
  }

  static createUnsafe(value: string): DocumentType {
    return new DocumentType(value as DocumentTypeValue)
  }

  get value(): DocumentTypeValue {
    return this._value
  }

  equals(other: DocumentType): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
