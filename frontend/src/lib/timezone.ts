/**
 * A operação é no Brasil e o post sai num horário do Brasil.
 *
 * O <input type="datetime-local"> não carrega fuso: "2026-09-22T09:00" é só
 * texto. Convertê-lo com new Date(...) o interpreta no fuso de quem está na
 * tela, então alguém agendando de outro fuso marcaria outra hora — sem erro,
 * sem aviso, e o post sairia na hora errada.
 */
export const OPERATION_TIMEZONE = 'America/Sao_Paulo'

/** Quantos minutos o fuso está à frente do UTC naquele instante. */
function offsetMinutes(at: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>

  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    // 24 aparece à meia-noite em algumas plataformas.
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  )

  return (asUTC - at.getTime()) / 60000
}

/**
 * Lê o valor de um datetime-local COMO horário de São Paulo e devolve o ISO
 * em UTC correspondente.
 *
 * Duas passadas de propósito: o deslocamento depende do instante, e o instante
 * depende do deslocamento. A segunda passada acerta quando a primeira cai do
 * lado errado de uma virada de horário de verão. O Brasil não tem horário de
 * verão desde 2019, mas fixar -03:00 no código voltaria a errar em silêncio se
 * ele voltar.
 */
export function localInputToISO(value: string, timeZone = OPERATION_TIMEZONE): string {
  const [date, time] = value.split('T')
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)

  const asIfUTC = Date.UTC(year, month - 1, day, hour, minute)

  const first = new Date(asIfUTC - offsetMinutes(new Date(asIfUTC), timeZone) * 60000)
  const second = new Date(asIfUTC - offsetMinutes(first, timeZone) * 60000)

  return second.toISOString()
}

/** Rótulo curto do fuso, para a tela dizer em que horário se está marcando. */
export function timezoneLabel(timeZone = OPERATION_TIMEZONE): string {
  const name = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    timeZoneName: 'short',
  })
    .formatToParts(new Date())
    .find((p) => p.type === 'timeZoneName')?.value

  return name ?? timeZone
}
