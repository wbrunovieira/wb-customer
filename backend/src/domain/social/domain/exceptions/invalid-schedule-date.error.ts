export class InvalidScheduleDateError extends Error {
  constructor(message = 'Agendamento precisa de uma data futura.') {
    super(message)
    this.name = 'InvalidScheduleDateError'
  }
}
