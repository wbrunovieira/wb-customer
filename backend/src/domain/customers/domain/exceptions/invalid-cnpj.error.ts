export class InvalidCnpjError extends Error {
  constructor(value: string) {
    super(`"${value}" is not a valid CNPJ`)
    this.name = 'InvalidCnpjError'
  }
}
