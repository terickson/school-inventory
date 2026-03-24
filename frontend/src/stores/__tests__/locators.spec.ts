import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLocatorsStore } from '../locators'

vi.mock('@/api', () => ({
  locatorsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listSublocators: vi.fn(),
    createSublocator: vi.fn(),
    updateSublocator: vi.fn(),
    deleteSublocator: vi.fn(),
  },
}))

import { locatorsApi } from '@/api'

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

describe('Locators Store', () => {
  it('fetchLocators populates locators and total', async () => {
    vi.mocked(locatorsApi.list).mockResolvedValue({ items: [{ id: 1, name: 'Closet A' }], total: 1, skip: 0, limit: 20 } as any)

    const store = useLocatorsStore()
    await store.fetchLocators()

    expect(store.locators).toHaveLength(1)
    expect(store.total).toBe(1)
    expect(store.loading).toBe(false)
  })

  it('fetchLocators sets error on failure', async () => {
    vi.mocked(locatorsApi.list).mockRejectedValue(new Error('Fail'))

    const store = useLocatorsStore()
    await expect(store.fetchLocators()).rejects.toThrow('Fail')
    expect(store.error).toBe('Fail')
  })

  it('fetchLocator sets currentLocator and fetches sublocators', async () => {
    vi.mocked(locatorsApi.get).mockResolvedValue({ id: 1, name: 'Closet A' } as any)
    vi.mocked(locatorsApi.listSublocators).mockResolvedValue({ items: [{ id: 10, name: 'Shelf 1' }], total: 1, skip: 0, limit: 20 } as any)

    const store = useLocatorsStore()
    await store.fetchLocator(1)

    expect(store.currentLocator).toEqual({ id: 1, name: 'Closet A' })
    expect(store.sublocators).toHaveLength(1)
    expect(locatorsApi.listSublocators).toHaveBeenCalledWith(1)
  })

  it('createLocator delegates to API', async () => {
    const locator = { id: 2, name: 'Closet B' }
    vi.mocked(locatorsApi.create).mockResolvedValue(locator as any)

    const store = useLocatorsStore()
    const result = await store.createLocator({ name: 'Closet B' })

    expect(result).toEqual(locator)
  })

  it('updateLocator delegates to API', async () => {
    const updated = { id: 1, name: 'Renamed' }
    vi.mocked(locatorsApi.update).mockResolvedValue(updated as any)

    const store = useLocatorsStore()
    const result = await store.updateLocator(1, { name: 'Renamed' })

    expect(result).toEqual(updated)
  })

  it('deleteLocator delegates to API', async () => {
    vi.mocked(locatorsApi.delete).mockResolvedValue()

    const store = useLocatorsStore()
    await store.deleteLocator(1)

    expect(locatorsApi.delete).toHaveBeenCalledWith(1)
  })

  it('createSublocator delegates to API', async () => {
    const sub = { id: 11, name: 'Shelf 2' }
    vi.mocked(locatorsApi.createSublocator).mockResolvedValue(sub as any)

    const store = useLocatorsStore()
    const result = await store.createSublocator(1, { name: 'Shelf 2' })

    expect(locatorsApi.createSublocator).toHaveBeenCalledWith(1, { name: 'Shelf 2' })
    expect(result).toEqual(sub)
  })

  it('deleteSublocator delegates to API', async () => {
    vi.mocked(locatorsApi.deleteSublocator).mockResolvedValue()

    const store = useLocatorsStore()
    await store.deleteSublocator(1, 10)

    expect(locatorsApi.deleteSublocator).toHaveBeenCalledWith(1, 10)
  })
})
