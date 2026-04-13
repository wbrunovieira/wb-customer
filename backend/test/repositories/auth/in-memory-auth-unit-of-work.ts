import { IAuthUnitOfWork } from '@/domain/auth/application/repositories/i-auth-unit-of-work'

export class InMemoryAuthUnitOfWork implements IAuthUnitOfWork {
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return fn()
  }
}
