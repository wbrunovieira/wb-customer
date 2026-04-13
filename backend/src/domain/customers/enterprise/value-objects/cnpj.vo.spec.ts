import { describe, it, expect } from 'vitest'
import { Cnpj } from './cnpj.vo'
import { InvalidCnpjError } from '../../domain/exceptions/invalid-cnpj.error'

describe('Cnpj', () => {
  it('should create a valid CNPJ from digits only', () => {
    const result = Cnpj.create('11222333000181')
    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.value).toBe('11222333000181')
    }
  })

  it('should create a valid CNPJ from formatted string', () => {
    const result = Cnpj.create('11.222.333/0001-81')
    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.value).toBe('11222333000181')
    }
  })

  it('should format the CNPJ correctly', () => {
    const result = Cnpj.create('11222333000181')
    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.formatted).toBe('11.222.333/0001-81')
    }
  })

  it('should return InvalidCnpjError for all-same-digits', () => {
    const result = Cnpj.create('11111111111111')
    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidCnpjError)
    }
  })

  it('should return InvalidCnpjError for wrong check digits', () => {
    const result = Cnpj.create('11222333000100')
    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidCnpjError)
    }
  })

  it('should return InvalidCnpjError for wrong length', () => {
    const result = Cnpj.create('1122233300018')
    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidCnpjError)
    }
  })

  it('should compare equality correctly', () => {
    const a = Cnpj.createUnsafe('11222333000181')
    const b = Cnpj.createUnsafe('11.222.333/0001-81')
    const c = Cnpj.createUnsafe('22333444000195')
    expect(a.equals(b)).toBe(true)
    expect(a.equals(c)).toBe(false)
  })
})
