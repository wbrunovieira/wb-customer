import { describe, it, expect, beforeEach } from 'vitest'
import { SaveSocialEngineConfigUseCase } from './save-social-engine-config.use-case'
import { InMemorySocialEngineConfigRepository } from './_test/in-memory-social-engine-config.repository'
import { InvalidSocialEngineConfigError } from '../../domain/exceptions/invalid-social-engine-config.error'

describe('SaveSocialEngineConfigUseCase', () => {
  let repo: InMemorySocialEngineConfigRepository
  let sut: SaveSocialEngineConfigUseCase

  beforeEach(() => {
    repo = new InMemorySocialEngineConfigRepository()
    sut = new SaveSocialEngineConfigUseCase(repo)
  })

  it('guarda url e chave', async () => {
    const result = await sut.execute({
      apiUrl: 'https://postiz.exemplo.com',
      apiKey: 'chave-valida-123',
    })

    expect(result.isRight()).toBe(true)
    expect(repo.record?.apiUrl).toBe('https://postiz.exemplo.com')
    expect(repo.record?.apiKey).toBe('chave-valida-123')
  })

  it('corta espaço em volta — uma chave colada com \\n falharia na autenticação sem dizer por quê', async () => {
    await sut.execute({
      apiUrl: '  https://postiz.exemplo.com  ',
      apiKey: '  chave-valida-123\n',
    })

    expect(repo.record?.apiKey).toBe('chave-valida-123')
    expect(repo.record?.apiUrl).toBe('https://postiz.exemplo.com')
  })

  it('tira a barra final da url para o adapter não montar caminho com barra dupla', async () => {
    await sut.execute({
      apiUrl: 'https://postiz.exemplo.com///',
      apiKey: 'chave',
    })

    expect(repo.record?.apiUrl).toBe('https://postiz.exemplo.com')
  })

  it('recusa url sem esquema', async () => {
    const result = await sut.execute({
      apiUrl: 'postiz.exemplo.com',
      apiKey: 'chave',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidSocialEngineConfigError)
    expect(repo.record).toBeNull()
  })

  it('recusa esquema que não é http nem https', async () => {
    const result = await sut.execute({
      apiUrl: 'ftp://postiz.exemplo.com',
      apiKey: 'chave',
    })

    expect(result.isLeft()).toBe(true)
    expect(repo.record).toBeNull()
  })

  it('recusa chave vazia', async () => {
    const result = await sut.execute({
      apiUrl: 'https://postiz.exemplo.com',
      apiKey: '   ',
    })

    expect(result.isLeft()).toBe(true)
    expect(repo.record).toBeNull()
  })

  it('recusa chave com espaço no meio — iria para um header HTTP', async () => {
    const result = await sut.execute({
      apiUrl: 'https://postiz.exemplo.com',
      apiKey: 'chave com espaco',
    })

    expect(result.isLeft()).toBe(true)
    expect(repo.record).toBeNull()
  })

  it('sobrescreve o cadastro anterior e preserva createdAt', async () => {
    await sut.execute({ apiUrl: 'https://a.com', apiKey: 'primeira' })
    const criadoEm = repo.record!.createdAt

    await sut.execute({ apiUrl: 'https://b.com', apiKey: 'segunda' })

    expect(repo.record?.apiKey).toBe('segunda')
    expect(repo.record?.createdAt).toEqual(criadoEm)
  })
})
