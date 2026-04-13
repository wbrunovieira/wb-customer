import { randomUUID } from 'crypto'

export class UniqueEntityID {
  private readonly _value: string

  constructor(value?: string) {
    this._value = value ?? randomUUID()
  }

  get value(): string {
    return this._value
  }

  equals(id?: UniqueEntityID | null): boolean {
    if (id === null || id === undefined) return false
    if (!(id instanceof UniqueEntityID)) return false
    return this._value === id.value
  }

  toString(): string {
    return this._value
  }
}
