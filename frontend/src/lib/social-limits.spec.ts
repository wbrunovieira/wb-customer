import { describe, it, expect } from 'vitest'
import { limitFor, strictestLimit, DEFAULT_LIMIT } from './social-limits'

describe('limitFor', () => {
  it('conhece os limites de cada rede', () => {
    expect(limitFor('instagram')).toBe(2200)
    expect(limitFor('linkedin')).toBe(3000)
    expect(limitFor('threads')).toBe(500)
  })

  it('cai no padrão para rede que ainda não mapeamos', () => {
    // Rede nova não pode quebrar a tela só porque este mapa não foi atualizado.
    expect(limitFor('rede-que-nao-existe')).toBe(DEFAULT_LIMIT)
  })
})

describe('strictestLimit', () => {
  it('devolve o menor limite entre as redes escolhidas', () => {
    // Escrever pensando no LinkedIn e descobrir o corte do Instagram no envio
    // é o erro que esta função existe para evitar.
    expect(strictestLimit(['linkedin', 'instagram'])).toBe(2200)
  })

  it('não é afetado pela ordem das redes', () => {
    expect(strictestLimit(['instagram', 'linkedin'])).toBe(
      strictestLimit(['linkedin', 'instagram']),
    )
  })

  it('devolve null quando nenhuma rede foi escolhida', () => {
    // Não há limite a mostrar ainda; inventar um número seria pior.
    expect(strictestLimit([])).toBeNull()
  })

  it('usa o padrão quando só há rede desconhecida', () => {
    expect(strictestLimit(['rede-nova'])).toBe(DEFAULT_LIMIT)
  })

  it('a rede mais restritiva manda mesmo entre várias', () => {
    expect(strictestLimit(['facebook', 'youtube', 'threads'])).toBe(500)
  })
})
