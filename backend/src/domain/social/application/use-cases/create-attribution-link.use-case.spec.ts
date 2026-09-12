import { describe, it, expect, beforeEach } from 'vitest'
import { CreateAttributionLinkUseCase } from './create-attribution-link.use-case'
import { InMemorySocialAttributionLinkRepository } from './_test/in-memory-social-attribution-link.repository'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { extractAttributionCode } from '../services/attribution-marker'

/** Deixa o código previsível, para exercitar a colisão sem depender de sorte. */
class SequencedUseCase extends CreateAttributionLinkUseCase {
  public codes: string[] = []
  protected override generateCode(): string {
    return this.codes.shift() ?? 'FALLBK'
  }
}

describe('CreateAttributionLinkUseCase', () => {
  let links: InMemorySocialAttributionLinkRepository
  let customers: InMemoryCustomerRepository
  let sut: CreateAttributionLinkUseCase

  const base = {
    customerId: 'customer-1',
    source: 'instagram',
    destinationPhone: '+55 (24) 99999-8888',
    createdByUserId: 'user-1',
  }

  beforeEach(async () => {
    links = new InMemorySocialAttributionLinkRepository()
    customers = new InMemoryCustomerRepository()
    await customers.save(makeCustomer({ id: 'customer-1' }))
    sut = new CreateAttributionLinkUseCase(customers, links)
  })

  it('cria o vínculo e devolve código, mensagem e link', async () => {
    const result = await sut.execute(base)

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return

    expect(result.value.code).toMatch(/^[A-Z0-9]{6}$/)
    expect(result.value.linkId).toBeTruthy()
    expect(result.value.url).toContain('https://wa.me/')
  })

  it('monta o link com o telefone só em dígitos e o código embutido', async () => {
    const result = await sut.execute(base)
    if (!result.isRight()) throw new Error('deveria ter criado')

    expect(result.value.url).toContain('wa.me/5524999998888')
    const text = decodeURIComponent(result.value.url.split('text=')[1])
    expect(extractAttributionCode(text)).toBe(result.value.code)
  })

  it('usa uma mensagem padrão que cita a rede quando nenhuma é informada', async () => {
    const result = await sut.execute(base)
    if (!result.isRight()) throw new Error('deveria ter criado')

    expect(result.value.prefilledMessage).toContain('Instagram')
  })

  it('respeita a mensagem base informada', async () => {
    const result = await sut.execute({ ...base, baseMessage: 'Quero encomendar uma peça' })
    if (!result.isRight()) throw new Error('deveria ter criado')

    expect(result.value.prefilledMessage).toContain('Quero encomendar uma peça')
  })

  it('persiste origem, referência do post e autor', async () => {
    await sut.execute({ ...base, postRef: 'carrossel-semana-3' })

    expect(links.items).toHaveLength(1)
    expect(links.items[0].source).toBe('instagram')
    expect(links.items[0].postRef).toBe('carrossel-semana-3')
    expect(links.items[0].createdByUserId).toBe('user-1')
    expect(links.items[0].customerId).toBe('customer-1')
  })

  it('persiste o mesmo código que devolveu', async () => {
    const result = await sut.execute(base)
    if (!result.isRight()) throw new Error('deveria ter criado')

    expect(links.items[0].code).toBe(result.value.code)
  })

  it('sorteia outro código quando o primeiro já está em uso', async () => {
    const seq = new SequencedUseCase(customers, links)
    seq.codes = ['AAAAAA', 'BBBBBB']
    await links.create({
      code: 'AAAAAA',
      source: 'instagram',
      customerId: 'customer-1',
      destinationPhone: '5524999998888',
      prefilledMessage: 'qualquer',
      createdByUserId: 'user-1',
    })

    const result = await seq.execute(base)
    if (!result.isRight()) throw new Error('deveria ter criado')

    expect(result.value.code).toBe('BBBBBB')
  })

  it('recusa cliente inexistente', async () => {
    const result = await sut.execute({ ...base, customerId: 'nao-existe' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CustomerNotFoundError)
    expect(links.items).toHaveLength(0)
  })
})
