export abstract class UnitOfWork {
  abstract execute<T>(fn: () => Promise<T>): Promise<T>
}
