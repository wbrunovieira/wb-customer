export class CustomerCategoryAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Customer category with name "${name}" already exists`)
    this.name = 'CustomerCategoryAlreadyExistsError'
  }
}
