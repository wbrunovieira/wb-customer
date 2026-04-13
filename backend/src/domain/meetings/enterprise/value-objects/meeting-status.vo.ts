import { Either, left, right } from '@/core/either'

export type MeetingStatusValue = 'scheduled' | 'ended' | 'cancelled'

const VALID: MeetingStatusValue[] = ['scheduled', 'ended', 'cancelled']

export class MeetingStatus {
  private constructor(private readonly _value: MeetingStatusValue) {}

  static create(value: string): Either<Error, MeetingStatus> {
    if (!VALID.includes(value as MeetingStatusValue)) {
      return left(new Error(`Invalid meeting status: "${value}"`))
    }
    return right(new MeetingStatus(value as MeetingStatusValue))
  }

  static createUnsafe(value: string): MeetingStatus {
    return new MeetingStatus(value as MeetingStatusValue)
  }

  get value(): MeetingStatusValue {
    return this._value
  }

  isScheduled(): boolean { return this._value === 'scheduled' }
  isEnded(): boolean { return this._value === 'ended' }
  isCancelled(): boolean { return this._value === 'cancelled' }

  toString(): string { return this._value }
}
