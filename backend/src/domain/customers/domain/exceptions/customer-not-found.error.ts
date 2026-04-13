export class CustomerNotFoundError extends Error {
  constructor(identifier?: string) {
    super(
      identifier ? `Customer "${identifier}" not found` : 'Customer not found',
    )
    this.name = 'CustomerNotFoundError'
  }
}
