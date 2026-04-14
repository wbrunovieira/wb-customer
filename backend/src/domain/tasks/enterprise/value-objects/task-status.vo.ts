import { Either, left, right } from '@/core/either'

export type TaskStatusValue = 'idea_could' | 'idea_should' | 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'

const VALID: TaskStatusValue[] = ['idea_could', 'idea_should', 'backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled']

export class TaskStatus {
  private constructor(private readonly _value: TaskStatusValue) {}

  static create(value: string): Either<Error, TaskStatus> {
    if (!VALID.includes(value as TaskStatusValue)) {
      return left(new Error(`Invalid task status: "${value}"`))
    }
    return right(new TaskStatus(value as TaskStatusValue))
  }

  static createUnsafe(value: string): TaskStatus {
    return new TaskStatus(value as TaskStatusValue)
  }

  get value(): TaskStatusValue { return this._value }

  isIdea(): boolean { return this._value === 'idea_could' || this._value === 'idea_should' }
  isBacklog(): boolean { return this._value === 'backlog' }
  isDone(): boolean { return this._value === 'done' }
  isCancelled(): boolean { return this._value === 'cancelled' }

  toString(): string { return this._value }
}
