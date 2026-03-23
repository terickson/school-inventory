import api from './axios'
import type {
  PaginatedResponse,
  PaginationParams,
  Item,
  ItemCreate,
  ItemUpdate,
  Category,
} from '@/types'

export const catalogApi = {
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

  async listCategories(): Promise<Category[]> {
    const { data } = await api.get<{ items: Category[] }>('/categories', { params: { limit: 100 } })
    return data.items
  },
}
