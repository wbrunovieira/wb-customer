export class CustomerCategoryNotFoundError extends Error {
  constructor(identifier?: string) {
    super(
      identifier
        ? `Customer category "${identifier}" not found`
        : 'Customer category not found',
    )
    this.name = 'CustomerCategoryNotFoundError'
  }
}
