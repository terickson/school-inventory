import api from './axios'
import type {
  PaginatedResponse,
  PaginationParams,
  InventoryRecord,
  InventoryCreate,
  InventoryUpdate,
  InventoryAdjust,
  InventoryFilters,
} from '@/types'

export const inventoryApi = {
  async list(
    params?: PaginationParams & InventoryFilters,
  ): Promise<PaginatedResponse<InventoryRecord>> {
    const { data } = await api.get<PaginatedResponse<InventoryRecord>>('/inventory', { params })
    return data
  },

  async get(id: number): Promise<InventoryRecord> {
    const { data } = await api.get<InventoryRecord>(`/inventory/${id}`)
    return data
  },

  async create(record: InventoryCreate): Promise<InventoryRecord> {
    const { data } = await api.post<InventoryRecord>('/inventory', record)
    return data
  },

  async update(id: number, record: InventoryUpdate): Promise<InventoryRecord> {
    const { data } = await api.patch<InventoryRecord>(`/inventory/${id}`, record)
    return data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/inventory/${id}`)
  },

  async adjust(id: number, adjustment: InventoryAdjust): Promise<InventoryRecord> {
    const { data } = await api.post<InventoryRecord>(`/inventory/${id}/adjust`, adjustment)
    return data
  },
}
