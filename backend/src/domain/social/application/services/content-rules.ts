/**
 * Regras editoriais da casa.
 *
 * São dados, não código espalhado: cada regra é um objeto nesta lista, e o
 * use-case só percorre a lista. Quando a régua crescer a ponto de precisar ser
 * editada sem deploy, a mudança é trocar a origem desta lista por uma tabela —
 * o contrato `ContentRule` já é a costura para isso.
 *
 * Por que validar no servidor e não só avisar na tela: as duas primeiras regras
 * já foram quebradas na prática (travessão em post publicado de abril de 2025,
 * "desde 2003" espalhado por oito arquivos). Regra que depende de alguém
 * lembrar é regra que falha.
 */

export type RuleSeverity = 'block' | 'warn'

export interface RuleViolation {
  ruleId: string
  severity: RuleSeverity
  /** Por que isto é problema, em linguagem de quem escreve o post. */
  message: string
  /** Trecho ao redor da ocorrência — "tem travessão" sozinho não ajuda a achar. */
  excerpt: string
  /** Posição na string original, para a interface destacar. */
  index: number
}

export interface ContentRule {
  id: string
  run(content: string): RuleViolation[]
}

/** Janela ao redor da ocorrência, para a pessoa localizar no texto. */
function excerptAround(content: string, index: number, length: number): string {
  const radius = 30
  const start = Math.max(0, index - radius)
  const end = Math.min(content.length, index + length + radius)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return `${prefix}${content.slice(start, end).trim()}${suffix}`
}

function matchAll(
  content: string,
  pattern: RegExp,
  build: (match: RegExpExecArray) => Omit<RuleViolation, 'excerpt' | 'index'> | null,
): RuleViolation[] {
  const out: RuleViolation[] = []
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
  let m: RegExpExecArray | null

  while ((m = re.exec(content)) !== null) {
    const built = build(m)
    if (built) {
      out.push({ ...built, index: m.index, excerpt: excerptAround(content, m.index, m[0].length) })
    }
    // Padrões de largura zero travariam o laço.
    if (m[0].length === 0) re.lastIndex++
  }

  return out
}

/** Travessão (—, U+2014). Hífen comum e meia-risca não contam. */
const emDashRule: ContentRule = {
  id: 'em-dash',
  run: (content) =>
    matchAll(content, /—/g, () => ({
      ruleId: 'em-dash',
      severity: 'block',
      message: 'Travessão não é usado nos textos da casa. Reescreva a frase ou use vírgula, ponto ou dois-pontos.',
    })),
}

/** Preço não entra na copy — a conversa de valor acontece no atendimento. */
const priceRule: ContentRule = {
  id: 'price',
  run: (content) =>
    matchAll(content, /R\$|a partir de|barato/gi, (m) => ({
      ruleId: 'price',
      severity: 'block',
      message: `"${m[0]}" fala de preço. O texto não anuncia valor; a conversa de preço é no atendimento.`,
    })),
}

/**
 * Alegação de fundação. Vale só para "desde <ano>": bloquear todo ano anterior
 * a 2023 pegaria qualquer menção a data ("a campanha de 2019 ensinou muito") e
 * a regra viraria ruído que as pessoas aprendem a ignorar.
 */
const FOUNDING_YEAR_FLOOR = 2023

const foundingYearRule: ContentRule = {
  id: 'founding-year',
  run: (content) =>
    matchAll(content, /desde\s+(\d{4})/gi, (m) => {
      const year = Number(m[1])

      if (year < FOUNDING_YEAR_FLOOR) {
        return {
          ruleId: 'founding-year',
          severity: 'block',
          message: `"${m[0]}" afirma uma fundação anterior a ${FOUNDING_YEAR_FLOOR}. Corrija o ano.`,
        }
      }

      if (year === FOUNDING_YEAR_FLOOR) {
        return {
          ruleId: 'founding-year',
          severity: 'warn',
          message: `"${m[0]}" está correto, mas confira se é mesmo o ano que você quer afirmar.`,
        }
      }

      return null
    }),
}

export const houseRules: ContentRule[] = [emDashRule, priceRule, foundingYearRule]
