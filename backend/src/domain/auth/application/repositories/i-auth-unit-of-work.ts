export abstract class IAuthUnitOfWork {
  abstract execute<T>(fn: () => Promise<T>): Promise<T>
}
