export class InvalidDocumentTypeError extends Error {
  constructor(type: string) {
    super(`Invalid document type: "${type}". Valid: proposal, contract, addendum, other`)
    this.name = 'InvalidDocumentTypeError'
  }
}
