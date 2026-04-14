export type RecurrenceTypeValue = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'

export class RecurrenceType {
  private constructor(private readonly _value: RecurrenceTypeValue) {}

  static createUnsafe(value: string): RecurrenceType {
    return new RecurrenceType(value as RecurrenceTypeValue)
  }

  get value(): RecurrenceTypeValue { return this._value }
  isNone(): boolean { return this._value === 'none' }
  toString(): string { return this._value }
}
