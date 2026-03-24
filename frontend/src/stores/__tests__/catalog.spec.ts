import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCatalogStore } from '../catalog'

vi.mock('@/api', () => ({
  catalogApi: {
    listItems: vi.fn(),
    getItem: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    listCategories: vi.fn(),
    listCategoriesPaginated: vi.fn(),
    getCategory: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    uploadItemImage: vi.fn(),
    deleteItemImage: vi.fn(),
  },
}))

import { catalogApi } from '@/api'

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

describe('Catalog Store', () => {
  describe('fetchItems', () => {
    it('sets loading, populates items and total on success', async () => {
      const mockItems = [{ id: 1, name: 'Pencil' }]
      vi.mocked(catalogApi.listItems).mockResolvedValue({ items: mockItems, total: 1, skip: 0, limit: 20 })

      const store = useCatalogStore()
      await store.fetchItems({ skip: 0, limit: 20 })

      expect(store.items).toEqual(mockItems)
      expect(store.total).toBe(1)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('sets error and re-throws on failure', async () => {
      vi.mocked(catalogApi.listItems).mockRejectedValue(new Error('Network error'))

      const store = useCatalogStore()
      await expect(store.fetchItems()).rejects.toThrow('Network error')

      expect(store.error).toBe('Network error')
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchCategories', () => {
    it('populates categories array', async () => {
      const cats = [{ id: 1, name: 'Writing' }]
      vi.mocked(catalogApi.listCategories).mockResolvedValue(cats as any)

      const store = useCatalogStore()
      await store.fetchCategories()

      expect(store.categories).toEqual(cats)
    })
  })

  describe('fetchCategoriesPaginated', () => {
    it('uses separate categoriesLoading state', async () => {
      vi.mocked(catalogApi.listCategoriesPaginated).mockResolvedValue({
        items: [{ id: 1, name: 'Art' }],
        total: 1,
        skip: 0,
        limit: 20,
      } as any)

      const store = useCatalogStore()
      await store.fetchCategoriesPaginated()

      expect(store.managedCategories).toHaveLength(1)
      expect(store.categoriesTotal).toBe(1)
      expect(store.categoriesLoading).toBe(false)
    })
  })

  describe('CRUD operations delegate to API', () => {
    it('createItem calls API and returns result', async () => {
      const newItem = { id: 2, name: 'Eraser' }
      vi.mocked(catalogApi.createItem).mockResolvedValue(newItem as any)

      const store = useCatalogStore()
      const result = await store.createItem({ name: 'Eraser', category_id: 1, unit_of_measure: 'unit' })

      expect(result).toEqual(newItem)
    })

    it('updateItem calls API', async () => {
      const updated = { id: 1, name: 'Pencil 2B' }
      vi.mocked(catalogApi.updateItem).mockResolvedValue(updated as any)

      const store = useCatalogStore()
      const result = await store.updateItem(1, { name: 'Pencil 2B' })

      expect(catalogApi.updateItem).toHaveBeenCalledWith(1, { name: 'Pencil 2B' })
      expect(result).toEqual(updated)
    })

    it('deleteItem calls API', async () => {
      vi.mocked(catalogApi.deleteItem).mockResolvedValue()

      const store = useCatalogStore()
      await store.deleteItem(1)

      expect(catalogApi.deleteItem).toHaveBeenCalledWith(1)
    })
  })

  describe('image operations', () => {
    it('uploadItemImage delegates to API', async () => {
      const file = new File(['img'], 'photo.png', { type: 'image/png' })
      const updatedItem = { id: 1, image_url: '/uploads/x.png' }
      vi.mocked(catalogApi.uploadItemImage).mockResolvedValue(updatedItem as any)

      const store = useCatalogStore()
      const result = await store.uploadItemImage(1, file)

      expect(catalogApi.uploadItemImage).toHaveBeenCalledWith(1, file)
      expect(result).toEqual(updatedItem)
    })

    it('deleteItemImage delegates to API', async () => {
      vi.mocked(catalogApi.deleteItemImage).mockResolvedValue()

      const store = useCatalogStore()
      await store.deleteItemImage(1)

      expect(catalogApi.deleteItemImage).toHaveBeenCalledWith(1)
    })
  })
})
