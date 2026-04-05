import api from './axios'
import type {
  PaginatedResponse,
  PaginationParams,
  Item,
  ItemCreate,
  ItemUpdate,
  Category,
  CategoryCreate,
  CategoryUpdate,
  IdentifySuggestion,
  Features,
} from '@/types'

export const catalogApi = {
  // --- Items ---

  async listItems(
    params?: PaginationParams & { category_id?: number },
  ): Promise<PaginatedResponse<Item>> {
    const { data } = await api.get<PaginatedResponse<Item>>('/items', { params })
    return data
  },

  async getItem(id: number): Promise<Item> {
    const { data } = await api.get<Item>(`/items/${id}`)
    return data
  },

  async createItem(item: ItemCreate): Promise<Item> {
    const { data } = await api.post<Item>('/items', item)
    return data
  },

  async updateItem(id: number, item: ItemUpdate): Promise<Item> {
    const { data } = await api.patch<Item>(`/items/${id}`, item)
    return data
  },

  async deleteItem(id: number): Promise<void> {
    await api.delete(`/items/${id}`)
  },

  async uploadItemImage(itemId: number, file: File): Promise<Item> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post<Item>(`/items/${itemId}/image`, formData, {
      headers: { 'Content-Type': undefined as unknown as string },
    })
    return data
  },

  async deleteItemImage(itemId: number): Promise<void> {
    await api.delete(`/items/${itemId}/image`)
  },

  // --- Categories ---

  async listCategories(): Promise<Category[]> {
    const { data } = await api.get<{ items: Category[] }>('/categories', { params: { limit: 100 } })
    return data.items
  },

  async listCategoriesPaginated(
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Category>> {
    const { data } = await api.get<PaginatedResponse<Category>>('/categories', { params })
    return data
  },

  async getCategory(id: number): Promise<Category> {
    const { data } = await api.get<Category>(`/categories/${id}`)
    return data
  },

  async createCategory(category: CategoryCreate): Promise<Category> {
    const { data } = await api.post<Category>('/categories', category)
    return data
  },

  async updateCategory(id: number, category: CategoryUpdate): Promise<Category> {
    const { data } = await api.patch<Category>(`/categories/${id}`, category)
    return data
  },

  async deleteCategory(id: number): Promise<void> {
    await api.delete(`/categories/${id}`)
  },

  // --- Features ---

  async getFeatures(): Promise<Features> {
    const { data } = await api.get<Features>('/features')
    return data
  },

  // --- Identify ---

  async identifyItem(file: File): Promise<IdentifySuggestion> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post<IdentifySuggestion>('/items/identify', formData, {
      headers: { 'Content-Type': undefined as unknown as string },
      timeout: 30000,
    })
    return data
  },
}
