/**
 * Limite de caracteres por rede.
 *
 * Fora do componente para poder ser testado: era lógica de regra vivendo dentro
 * de JSX, onde nenhum teste alcançava.
 */
export const NETWORK_LIMITS: Record<string, number> = {
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  tiktok: 2200,
  youtube: 5000,
  threads: 500,
}

/** Rede desconhecida cai no limite mais comum, que é o do Instagram. */
export const DEFAULT_LIMIT = 2200

export function limitFor(provider: string): number {
  return NETWORK_LIMITS[provider] ?? DEFAULT_LIMIT
}

/**
 * O menor limite entre as redes escolhidas — é contra ele que se escreve.
 *
 * Contar contra o maior deixaria alguém escrever três mil caracteres pensando
 * no LinkedIn e descobrir no envio que o Instagram corta em 2.200.
 *
 * Nenhuma rede escolhida devolve null: não há limite a mostrar ainda, e exibir
 * um número inventado seria pior do que não exibir nada.
 */
export function strictestLimit(providers: string[]): number | null {
  if (providers.length === 0) return null
  return Math.min(...providers.map(limitFor))
}
