export class CustomerNotLinkedToGroupError extends Error {
  constructor(customerId: string) {
    super(
      `Cliente "${customerId}" ainda não está ligado a um grupo do motor de publicação. Ligue antes de publicar.`,
    )
    this.name = 'CustomerNotLinkedToGroupError'
  }
}
