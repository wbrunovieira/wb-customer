import { describe, it, expect, beforeEach } from 'vitest'
import { TestSocialEngineConfigUseCase } from './test-social-engine-config.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'

describe('TestSocialEngineConfigUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let sut: TestSocialEngineConfigUseCase

  beforeEach(() => {
    engine = new InMemorySocialEngineGateway()
    sut = new TestSocialEngineConfigUseCase(engine)
  })

  it('recusa antes de falar com o motor quando não há credencial', async () => {
    engine.configured = false

    const result = await sut.execute()

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(SocialEngineNotConfiguredError)
  })

  it('conta os grupos que o motor devolveu', async () => {
    engine.groups = [
      { id: 'g1', name: 'Cliente A' },
      { id: 'g2', name: 'Cliente B' },
    ]

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value).toEqual({ ok: true, groups: 2 })
    }
  })

  it('zero grupos ainda é sucesso — a chave autenticou, só não há grupo criado', async () => {
    engine.groups = []

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value.groups).toBe(0)
  })

  it('devolve a falha do motor em vez de estourar', async () => {
    engine.listGroups = async () => {
      throw new Error('Postiz respondeu 401 em groups')
    }

    const result = await sut.execute()

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('401')
  })
})
