/**
 * Marcação de origem para conversas de WhatsApp.
 *
 * Nem Activity nem WhatsAppMessage têm campo de origem, então atribuir uma
 * conversa ao post que a gerou não sai de um cruzamento de dados — precisa de
 * marcação. O caminho que fecha o ciclo com o que o Evolution já entrega é um
 * link wa.me com texto pré-preenchido: a primeira mensagem chega com o código,
 * e o webhook o encontra no campo `text` que já é capturado hoje.
 */

/**
 * Sem O, 0, 1 e I: o código é lido por gente e às vezes ditado por telefone,
 * e esses quatro são os que se confundem.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

/** `[ref: ABC123]` — tolerante a caixa e a espaço, porque a pessoa edita em volta. */
const MARKER_PATTERN = /\[ref:\s*([A-Za-z0-9]{4,12})\s*\]/i

export function buildAttributionCode(): string {
  let out = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return out
}

/**
 * O texto que o cliente vê ao abrir a conversa. O marcador fica no fim, entre
 * colchetes, para não atrapalhar a leitura da frase.
 */
export function buildPrefilledMessage(base: string, code: string): string {
  return `${base.trim()} [ref: ${code}]`
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/** Código da mensagem recebida, ou null quando ela não carrega marcador. */
export function extractAttributionCode(text: string | null | undefined): string | null {
  if (!text) return null

  const match = MARKER_PATTERN.exec(text)
  if (!match) return null

  return match[1].toUpperCase()
}
