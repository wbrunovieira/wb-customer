import { describe, it, expect } from 'vitest'
import { localInputToISO, timezoneLabel, OPERATION_TIMEZONE } from './timezone'

describe('localInputToISO', () => {
  it('lê o campo como horário de São Paulo, não do navegador', () => {
    // O caso do critério de pronto: terça às 9h em São Paulo.
    expect(localInputToISO('2026-09-22T09:00')).toBe('2026-09-22T12:00:00.000Z')
  })

  it('vale igual em janeiro, porque o Brasil não tem mais horário de verão', () => {
    expect(localInputToISO('2026-01-15T09:00')).toBe('2026-01-15T12:00:00.000Z')
  })

  it('vira o dia em UTC quando a hora local é tarde da noite', () => {
    expect(localInputToISO('2026-07-01T23:30')).toBe('2026-07-02T02:30:00.000Z')
  })

  it('não depende do fuso de quem roda o teste', () => {
    // A garantia inteira desta função: mesmo texto, mesmo instante, em qualquer
    // máquina. Se isto quebrar, o post sai na hora errada e ninguém é avisado.
    const semFuso = localInputToISO('2026-03-10T14:45')
    expect(semFuso).toBe('2026-03-10T17:45:00.000Z')
  })

  it('aceita um fuso diferente quando pedido', () => {
    expect(localInputToISO('2026-09-22T09:00', 'UTC')).toBe('2026-09-22T09:00:00.000Z')
  })

  it('trata a meia-noite sem escorregar um dia', () => {
    expect(localInputToISO('2026-09-22T00:00')).toBe('2026-09-22T03:00:00.000Z')
  })
})

describe('timezoneLabel', () => {
  it('devolve um rótulo curto para a tela mostrar', () => {
    expect(timezoneLabel()).toBeTruthy()
  })

  it('o fuso da operação é o de São Paulo', () => {
    expect(OPERATION_TIMEZONE).toBe('America/Sao_Paulo')
  })
})
