import { describe, it, expect, beforeEach } from 'vitest'
import { GetSocialEngineConfigStatusUseCase } from './get-social-engine-config-status.use-case'
import { InMemorySocialEngineConfigRepository } from './_test/in-memory-social-engine-config.repository'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'

describe('GetSocialEngineConfigStatusUseCase', () => {
  let repo: InMemorySocialEngineConfigRepository
  let engine: InMemorySocialEngineGateway
  let sut: GetSocialEngineConfigStatusUseCase

  beforeEach(() => {
    repo = new InMemorySocialEngineConfigRepository()
    engine = new InMemorySocialEngineGateway()
    sut = new GetSocialEngineConfigStatusUseCase(repo, engine)
  })

  it('sem cadastro no banco, diz que não está no banco', async () => {
    engine.configured = false

    const { value } = await sut.execute()

    expect(value.storedInDatabase).toBe(false)
    expect(value.apiUrl).toBeNull()
    expect(value.keyFingerprint).toBeNull()
    expect(value.configured).toBe(false)
  })

  it('reporta configured pelo motor, não pelo banco — o .env também configura', async () => {
    engine.configured = true

    const { value } = await sut.execute()

    // Nada no banco, e ainda assim configurado: é o fallback de ambiente.
    expect(value.storedInDatabase).toBe(false)
    expect(value.configured).toBe(true)
  })

  it('com cadastro, devolve url e digital', async () => {
    await repo.save({ apiUrl: 'https://postiz.exemplo.com', apiKey: 'segredo' })

    const { value } = await sut.execute()

    expect(value.storedInDatabase).toBe(true)
    expect(value.apiUrl).toBe('https://postiz.exemplo.com')
    expect(value.keyFingerprint).toHaveLength(8)
    expect(value.updatedAt).toBeInstanceOf(Date)
  })

  it('nunca devolve a chave em campo nenhum', async () => {
    await repo.save({ apiUrl: 'https://postiz.exemplo.com', apiKey: 'chave-super-secreta' })

    const { value } = await sut.execute()

    expect(JSON.stringify(value)).not.toContain('chave-super-secreta')
  })

  it('a digital é estável para a mesma chave e muda para outra', async () => {
    await repo.save({ apiUrl: 'https://a.com', apiKey: 'mesma' })
    const primeira = (await sut.execute()).value.keyFingerprint

    await repo.save({ apiUrl: 'https://a.com', apiKey: 'mesma' })
    expect((await sut.execute()).value.keyFingerprint).toBe(primeira)

    await repo.save({ apiUrl: 'https://a.com', apiKey: 'outra' })
    expect((await sut.execute()).value.keyFingerprint).not.toBe(primeira)
  })
})
