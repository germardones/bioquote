import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQuotationStore } from '../../src/store/quotation'

describe('useQuotationStore', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useQuotationStore()
  })

  it('calculates total with multiple services, extras and extra hours', () => {
    store.servicios = [
      { cobroBase: 1000 },
      { cobroBase: 2000 }
    ]
    store.servicio = { cobroBase: 500, cobroAdicional: 100 }
    store.adicionales = [
      { precio: 300 },
      { precio: 200 }
    ]
    store.horasExtra = 2
    expect(store.total).toBe(3700)
  })
})
