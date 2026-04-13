export class InvalidCustomerStatusError extends Error {
  constructor(value: string) {
    super(`"${value}" is not a valid customer status`)
    this.name = 'InvalidCustomerStatusError'
  }
}
