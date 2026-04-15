import { describe, it, expect, beforeEach } from 'vitest'
import { CreateCreativeUseCase } from './create-creative.use-case'
import { InMemoryCreativeRepository } from './_test/in-memory-creative.repository'
import { InMemoryCustomerRepository } from './_test/in-memory-customer.repository'
import { makeCustomer } from './_test/factories'

let creativeRepo: InMemoryCreativeRepository
let customerRepo: InMemoryCustomerRepository
let sut: CreateCreativeUseCase

beforeEach(() => {
  creativeRepo = new InMemoryCreativeRepository()
  customerRepo = new InMemoryCustomerRepository()
  sut = new CreateCreativeUseCase(creativeRepo, customerRepo)
})

describe('CreateCreativeUseCase', () => {
  it('should create a creative with draft status by default', async () => {
    const customer = makeCustomer()
    await customerRepo.save(customer)

    const result = await sut.execute({
      customerId: customer.id.value,
      title: 'Anúncio de lançamento',
      type: 'image',
      createdByUserId: 'user-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const creative = creativeRepo.items[0]
      expect(creative.status).toBe('draft')
      expect(creative.title).toBe('Anúncio de lançamento')
      expect(creative.type).toBe('image')
      expect(result.value.creativeId).toBe(creative.id.value)
    }
  })

  it('should persist caption, designDescription and objective', async () => {
    const customer = makeCustomer()
    await customerRepo.save(customer)

    await sut.execute({
      customerId: customer.id.value,
      title: 'Vídeo produto',
      type: 'video',
      caption: 'Conheça nosso produto',
      designDescription: 'Fundo branco, produto centralizado',
      objective: 'leads',
      createdByUserId: 'user-1',
    })

    const creative = creativeRepo.items[0]
    expect(creative.caption).toBe('Conheça nosso produto')
    expect(creative.designDescription).toBe('Fundo branco, produto centralizado')
    expect(creative.objective).toBe('leads')
  })

  it('should return error when customer does not exist', async () => {
    const result = await sut.execute({
      customerId: 'non-existent',
      title: 'Test',
      type: 'image',
      createdByUserId: 'user-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(Error)
    expect((result.value as Error).message).toContain('non-existent')
  })

  it('should return error for invalid creative type', async () => {
    const customer = makeCustomer()
    await customerRepo.save(customer)

    const result = await sut.execute({
      customerId: customer.id.value,
      title: 'Test',
      type: 'banner' as never,
      createdByUserId: 'user-1',
    })

    expect(result.isLeft()).toBe(true)
  })

  it('should NOT persist when customer does not exist', async () => {
    await sut.execute({
      customerId: 'ghost',
      title: 'Test',
      type: 'image',
      createdByUserId: 'user-1',
    })
    expect(creativeRepo.items).toHaveLength(0)
  })
})
