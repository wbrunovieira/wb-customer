/**
 * O motor recusou ou não respondeu.
 *
 * Carrega a mensagem dele de propósito. Antes disto, uma recusa do motor virava
 * 500 "Internal server error" para quem chamou, enquanto o motivo — em texto
 * claro, vindo do motor — ficava só no log do servidor. Quem integra não tinha
 * como saber o que corrigir sem pedir a alguém para ler o log.
 */
export class SocialEngineFailureError extends Error {
  constructor(motivo: string) {
    super(`O motor de publicação recusou: ${motivo}`)
    this.name = 'SocialEngineFailureError'
  }
}
