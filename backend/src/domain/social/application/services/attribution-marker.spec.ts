import { describe, it, expect } from 'vitest'
import {
  buildAttributionCode,
  buildPrefilledMessage,
  buildWhatsAppLink,
  extractAttributionCode,
} from './attribution-marker'

describe('attribution-marker', () => {
  // ── Código ─────────────────────────────────────────────────────────────────

  it('gera código curto, legível e sem caracteres ambíguos', () => {
    const code = buildAttributionCode()

    expect(code).toMatch(/^[A-Z0-9]{6}$/)
    // O código é lido e às vezes digitado por gente; 0/O e 1/I confundem.
    expect(code).not.toMatch(/[O01I]/)
  })

  it('não repete o código em sequência', () => {
    const codes = new Set(Array.from({ length: 200 }, () => buildAttributionCode()))

    expect(codes.size).toBeGreaterThan(190)
  })

  // ── Mensagem pré-preenchida ────────────────────────────────────────────────

  it('inclui o marcador na mensagem que o cliente vê', () => {
    const msg = buildPrefilledMessage('Olá! Vim pelo Instagram.', 'K7MQ2A')

    expect(msg).toContain('Olá! Vim pelo Instagram.')
    expect(msg).toContain('K7MQ2A')
  })

  it('mantém o marcador extraível da mensagem que ele mesmo gerou', () => {
    const msg = buildPrefilledMessage('Quero encomendar uma peça', 'ZW9TK4')

    expect(extractAttributionCode(msg)).toBe('ZW9TK4')
  })

  // ── Link ───────────────────────────────────────────────────────────────────

  it('monta o wa.me com o telefone só em dígitos', () => {
    const url = buildWhatsAppLink('+55 (24) 99999-8888', 'Oi [ref: K7MQ2A]')

    expect(url).toContain('https://wa.me/5524999998888')
  })

  it('codifica o texto para URL', () => {
    const url = buildWhatsAppLink('5524999998888', 'Olá! Vim pelo Instagram. [ref: K7MQ2A]')

    expect(url).toContain('text=')
    expect(url).not.toContain(' ')
    expect(decodeURIComponent(url.split('text=')[1])).toContain('K7MQ2A')
  })

  // ── Extração ───────────────────────────────────────────────────────────────

  it('extrai o código de uma mensagem recebida', () => {
    expect(extractAttributionCode('Olá! Vim pelo Instagram. [ref: K7MQ2A]')).toBe('K7MQ2A')
  })

  it('extrai mesmo quando a pessoa escreveu antes ou depois do marcador', () => {
    // O texto vem pré-preenchido, mas nada impede a pessoa de editar em volta.
    expect(extractAttributionCode('bom dia [ref: ZW9TK4] tudo bem?')).toBe('ZW9TK4')
  })

  it('aceita variação de espaço e caixa no marcador', () => {
    expect(extractAttributionCode('[REF:K7MQ2A]')).toBe('K7MQ2A')
    expect(extractAttributionCode('[ref:   K7MQ2A  ]')).toBe('K7MQ2A')
  })

  it('devolve null quando não há marcador', () => {
    expect(extractAttributionCode('Olá, queria um orçamento')).toBeNull()
  })

  it('devolve null para texto vazio ou ausente', () => {
    expect(extractAttributionCode('')).toBeNull()
    expect(extractAttributionCode(null)).toBeNull()
  })

  it('ignora algo que só parece marcador', () => {
    expect(extractAttributionCode('me manda a ref do produto')).toBeNull()
    expect(extractAttributionCode('[ref: ]')).toBeNull()
  })
})
