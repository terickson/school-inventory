import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Item, ItemCreate, ItemUpdate, Category, PaginationParams } from '@/types'
import { catalogApi } from '@/api'

export const useCatalogStore = defineStore('catalog', () => {
  const items = ref<Item[]>([])
  const categories = ref<Category[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchItems(params?: PaginationParams & { category_id?: number }) {
    loading.value = true
    error.value = null
    try {
      const res = await catalogApi.listItems(params)
      items.value = res.items
      total.value = res.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch items'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchCategories() {
    try {
      categories.value = await catalogApi.listCategories()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch categories'
      throw e
    }
  }

  async function createItem(item: ItemCreate): Promise<Item> {
    return await catalogApi.createItem(item)
  }

  async function updateItem(id: number, item: ItemUpdate): Promise<Item> {
    return await catalogApi.updateItem(id, item)
  }

  async function deleteItem(id: number): Promise<void> {
    await catalogApi.deleteItem(id)
  }

  return {
    items,
    categories,
    total,
    loading,
    error,
    fetchItems,
    fetchCategories,
    createItem,
    updateItem,
    deleteItem,
  }
})
