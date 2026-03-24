import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInventoryStore } from '../inventory'

vi.mock('@/api', () => ({
  inventoryApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    adjust: vi.fn(),
  },
}))

import { inventoryApi } from '@/api'

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

describe('Inventory Store', () => {
  it('fetchRecords populates records and total', async () => {
    vi.mocked(inventoryApi.list).mockResolvedValue({ items: [{ id: 1 }], total: 1, skip: 0, limit: 20 } as any)

    const store = useInventoryStore()
    await store.fetchRecords()

    expect(store.records).toHaveLength(1)
    expect(store.total).toBe(1)
    expect(store.loading).toBe(false)
  })

  it('fetchRecords sets error on failure', async () => {
    vi.mocked(inventoryApi.list).mockRejectedValue(new Error('Network'))

    const store = useInventoryStore()
    await expect(store.fetchRecords()).rejects.toThrow('Network')
    expect(store.error).toBe('Network')
  })

  it('createRecord delegates to API', async () => {
    const record = { id: 2 }
    vi.mocked(inventoryApi.create).mockResolvedValue(record as any)

    const store = useInventoryStore()
    const result = await store.createRecord({ item_id: 1, locator_id: 1, sublocator_id: 1, quantity: 10, min_quantity: 2 })

    expect(result).toEqual(record)
  })

  it('updateRecord delegates to API', async () => {
    const updated = { id: 1, quantity: 20 }
    vi.mocked(inventoryApi.update).mockResolvedValue(updated as any)

    const store = useInventoryStore()
    const result = await store.updateRecord(1, { min_quantity: 5 })

    expect(inventoryApi.update).toHaveBeenCalledWith(1, { min_quantity: 5 })
    expect(result).toEqual(updated)
  })

  it('deleteRecord delegates to API', async () => {
    vi.mocked(inventoryApi.delete).mockResolvedValue()

    const store = useInventoryStore()
    await store.deleteRecord(1)

    expect(inventoryApi.delete).toHaveBeenCalledWith(1)
  })

  it('adjustStock delegates to API', async () => {
    const adjusted = { id: 1, quantity: 15 }
    vi.mocked(inventoryApi.adjust).mockResolvedValue(adjusted as any)

    const store = useInventoryStore()
    const result = await store.adjustStock(1, { adjustment: 5, reason: 'Restock' })

    expect(inventoryApi.adjust).toHaveBeenCalledWith(1, { adjustment: 5, reason: 'Restock' })
    expect(result).toEqual(adjusted)
  })
})
