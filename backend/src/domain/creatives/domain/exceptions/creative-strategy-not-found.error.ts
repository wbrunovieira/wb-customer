export class CreativeStrategyNotFoundError extends Error {
  constructor(id: string) {
    super(`CreativeStrategy "${id}" not found`)
    this.name = 'CreativeStrategyNotFoundError'
  }
}
