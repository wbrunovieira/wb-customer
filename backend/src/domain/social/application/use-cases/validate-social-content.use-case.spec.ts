import { describe, it, expect, beforeEach } from 'vitest'
import { ValidateSocialContentUseCase } from './validate-social-content.use-case'

describe('ValidateSocialContentUseCase', () => {
  let sut: ValidateSocialContentUseCase

  beforeEach(() => {
    sut = new ValidateSocialContentUseCase()
  })

  const run = (content: string) => {
    const result = sut.execute({ content })
    if (result.isLeft()) throw new Error('não deveria falhar')
    return result.value
  }

  const ids = (content: string) => run(content).violations.map((v) => v.ruleId)

  it('aprova texto limpo', () => {
    const out = run('Peça feita à mão, sob encomenda. Fale com a gente no WhatsApp.')

    expect(out.ok).toBe(true)
    expect(out.violations).toHaveLength(0)
  })

  // ── Travessão ──────────────────────────────────────────────────────────────

  it('bloqueia travessão', () => {
    const out = run('Crochê artesanal — feito à mão em Petrópolis.')

    expect(out.ok).toBe(false)
    expect(ids('Crochê artesanal — feito à mão.')).toContain('em-dash')
  })

  it('aponta o trecho do travessão, não só a regra', () => {
    // Num carrossel de 800 caracteres, "tem travessão" sem localização é inútil.
    const out = run('a'.repeat(300) + ' — fim')
    const v = out.violations.find((x) => x.ruleId === 'em-dash')!

    expect(v.index).toBeGreaterThan(290)
    expect(v.excerpt).toContain('—')
  })

  it('não confunde hífen comum com travessão', () => {
    expect(ids('Peça infanto-juvenil, meia-malha.')).not.toContain('em-dash')
  })

  // ── Preço ──────────────────────────────────────────────────────────────────

  it('bloqueia preço em reais', () => {
    expect(ids('Leve por R$ 120,00.')).toContain('price')
  })

  it('bloqueia "a partir de"', () => {
    expect(ids('Peças a partir de cento e vinte.')).toContain('price')
  })

  it('bloqueia "barato"', () => {
    expect(ids('O mais barato da região.')).toContain('price')
  })

  it('reconhece preço independente de caixa', () => {
    expect(ids('A PARTIR DE hoje, BARATO não é conosco.')).toContain('price')
  })

  // ── Ano de fundação ────────────────────────────────────────────────────────

  it('bloqueia "desde 2003"', () => {
    const out = run('Tradição desde 2003.')

    expect(out.ok).toBe(false)
    expect(out.violations.map((v) => v.ruleId)).toContain('founding-year')
  })

  it('bloqueia qualquer ano anterior a 2023', () => {
    expect(ids('Presente no mercado desde 2019.')).toContain('founding-year')
  })

  it('alerta sobre "desde 2023" sem bloquear', () => {
    const out = run('Trabalhando desde 2023.')
    const v = out.violations.find((x) => x.ruleId === 'founding-year')!

    expect(v.severity).toBe('warn')
    expect(out.ok).toBe(true)
  })

  it('aceita ano posterior a 2023 sem comentar', () => {
    expect(ids('Nova coleção desde 2025.')).toHaveLength(0)
  })

  it('não reclama de ano que não é alegação de fundação', () => {
    // Bloquear todo ano anterior a 2023 geraria falso positivo em qualquer
    // menção a data. A regra vale para a alegação — "desde <ano>".
    expect(ids('A campanha de 2019 ensinou muito.')).not.toContain('founding-year')
  })

  // ── Combinação ─────────────────────────────────────────────────────────────

  it('reporta todas as violações do texto, não só a primeira', () => {
    const out = run('Desde 2003 — o crochê mais barato, a partir de R$ 50.')

    expect(out.ok).toBe(false)
    expect(new Set(out.violations.map((v) => v.ruleId))).toEqual(
      new Set(['em-dash', 'price', 'founding-year']),
    )
  })

  it('bloqueia quando há violação de bloqueio, mesmo com alerta junto', () => {
    const out = run('Desde 2023 — sempre à mão.')

    expect(out.ok).toBe(false)
    expect(out.violations.some((v) => v.severity === 'warn')).toBe(true)
    expect(out.violations.some((v) => v.severity === 'block')).toBe(true)
  })

  it('cada violação traz mensagem explicando o porquê', () => {
    const out = run('R$ 10')

    expect(out.violations[0].message.length).toBeGreaterThan(10)
  })

  // ── Entrada vazia ──────────────────────────────────────────────────────────

  it('aprova conteúdo vazio, que é problema de outra validação', () => {
    expect(run('').ok).toBe(true)
  })
})
