import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Item, ItemCreate, ItemUpdate, Category, CategoryCreate, CategoryUpdate, PaginationParams } from '@/types'
import { catalogApi } from '@/api'

export const useCatalogStore = defineStore('catalog', () => {
  // --- Items state ---
  const items = ref<Item[]>([])
  const categories = ref<Category[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // --- Categories management state ---
  const managedCategories = ref<Category[]>([])
  const categoriesTotal = ref(0)
  const categoriesLoading = ref(false)

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

  async function fetchCategoriesPaginated(params?: PaginationParams) {
    categoriesLoading.value = true
    error.value = null
    try {
      const res = await catalogApi.listCategoriesPaginated(params)
      managedCategories.value = res.items
      categoriesTotal.value = res.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch categories'
      throw e
    } finally {
      categoriesLoading.value = false
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

  async function createCategory(category: CategoryCreate): Promise<Category> {
    return await catalogApi.createCategory(category)
  }

  async function updateCategory(id: number, category: CategoryUpdate): Promise<Category> {
    return await catalogApi.updateCategory(id, category)
  }

  async function deleteCategory(id: number): Promise<void> {
    await catalogApi.deleteCategory(id)
  }

  return {
    items,
    categories,
    total,
    loading,
    error,
    managedCategories,
    categoriesTotal,
    categoriesLoading,
    fetchItems,
    fetchCategories,
    fetchCategoriesPaginated,
    createItem,
    updateItem,
    deleteItem,
    createCategory,
    updateCategory,
    deleteCategory,
  }
})
