export class InvalidDocumentStatusError extends Error {
  constructor(status: string) {
    super(
      `Invalid document status: "${status}". Valid: pending_signature, signed, expired, cancelled`,
    )
    this.name = 'InvalidDocumentStatusError'
  }
}
