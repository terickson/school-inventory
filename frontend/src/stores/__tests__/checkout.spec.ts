import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCheckoutStore } from '../checkout'

vi.mock('@/api', () => ({
  checkoutApi: {
    list: vi.fn(),
    overdue: vi.fn(),
    summary: vi.fn(),
    create: vi.fn(),
    returnCheckout: vi.fn(),
    extend: vi.fn(),
  },
}))

import { checkoutApi } from '@/api'

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

describe('Checkout Store', () => {
  it('fetchCheckouts populates checkouts and total', async () => {
    vi.mocked(checkoutApi.list).mockResolvedValue({ items: [{ id: 1 }], total: 1, skip: 0, limit: 20 } as any)

    const store = useCheckoutStore()
    await store.fetchCheckouts()

    expect(store.checkouts).toHaveLength(1)
    expect(store.total).toBe(1)
    expect(store.loading).toBe(false)
  })

  it('fetchCheckouts sets error on failure', async () => {
    vi.mocked(checkoutApi.list).mockRejectedValue(new Error('Fail'))

    const store = useCheckoutStore()
    await expect(store.fetchCheckouts()).rejects.toThrow('Fail')
    expect(store.error).toBe('Fail')
  })

  it('fetchOverdue populates overdueList and overdueTotal', async () => {
    vi.mocked(checkoutApi.overdue).mockResolvedValue({ items: [{ id: 2 }], total: 1, skip: 0, limit: 20 } as any)

    const store = useCheckoutStore()
    await store.fetchOverdue()

    expect(store.overdueList).toHaveLength(1)
    expect(store.overdueTotal).toBe(1)
  })

  it('fetchSummary populates summary', async () => {
    const summaryData = { active: 5, overdue: 2, total_items: 50 }
    vi.mocked(checkoutApi.summary).mockResolvedValue(summaryData as any)

    const store = useCheckoutStore()
    await store.fetchSummary()

    expect(store.summary).toEqual(summaryData)
  })

  it('createCheckout delegates to API', async () => {
    const checkout = { id: 3 }
    vi.mocked(checkoutApi.create).mockResolvedValue(checkout as any)

    const store = useCheckoutStore()
    const result = await store.createCheckout({ inventory_id: 1, quantity: 1, due_date: '2026-04-01' })

    expect(result).toEqual(checkout)
  })

  it('returnCheckout delegates to API', async () => {
    const returned = { id: 3, status: 'returned' }
    vi.mocked(checkoutApi.returnCheckout).mockResolvedValue(returned as any)

    const store = useCheckoutStore()
    const result = await store.returnCheckout(3, { quantity: 1 })

    expect(checkoutApi.returnCheckout).toHaveBeenCalledWith(3, { quantity: 1 })
    expect(result).toEqual(returned)
  })

  it('extendCheckout delegates to API', async () => {
    const extended = { id: 3, due_date: '2026-05-01' }
    vi.mocked(checkoutApi.extend).mockResolvedValue(extended as any)

    const store = useCheckoutStore()
    const result = await store.extendCheckout(3, { new_due_date: '2026-05-01' })

    expect(result).toEqual(extended)
  })
})
