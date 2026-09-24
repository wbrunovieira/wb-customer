import { describe, it, expect } from 'vitest'
import { adminGoogleRedirect } from './google-oauth.controller'

describe('adminGoogleRedirect', () => {
  it('usa FRONTEND_URL quando definida', () => {
    expect(adminGoogleRedirect('https://customer.wbdigitalsolutions.com')).toBe(
      'https://customer.wbdigitalsolutions.com/admin/google?connected=1',
    )
  })

  it('cai em localhost quando não há FRONTEND_URL — desenvolvimento', () => {
    expect(adminGoogleRedirect(undefined)).toBe(
      'http://localhost:3000/admin/google?connected=1',
    )
  })

  it('não produz barra dupla quando a base termina em barra', () => {
    // Um // no meio da URL é o tipo de coisa que alguns proxies redirecionam e
    // outros recusam; melhor nunca gerar.
    expect(adminGoogleRedirect('https://exemplo.com///')).toBe(
      'https://exemplo.com/admin/google?connected=1',
    )
  })
})
