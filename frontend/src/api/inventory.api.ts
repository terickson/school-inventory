import api from './axios'
import type {
  PaginatedResponse,
  PaginationParams,
  InventoryRecord,
  InventoryCreate,
  InventoryUpdate,
  InventoryAdjust,
  InventoryFilters,
  QuickAddRequest,
  QuickAddResponse,
  ImportResult,
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

  async quickAdd(payload: QuickAddRequest): Promise<QuickAddResponse> {
    const { data } = await api.post<QuickAddResponse>('/inventory/quick-add', payload)
    return data
  },

  async exportCsv(locatorId: number, sublocatorId?: number): Promise<Blob> {
    const params: Record<string, number> = { locator_id: locatorId }
    if (sublocatorId) params.sublocator_id = sublocatorId
    const { data } = await api.get('/inventory/export', {
      params,
      responseType: 'blob',
    })
    return data as Blob
  },

  async importCsv(locatorId: number, file: File): Promise<ImportResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('locator_id', locatorId.toString())
    const { data } = await api.post<ImportResult>('/inventory/import', formData, {
      headers: { 'Content-Type': undefined as unknown as string },
    })
    return data
  },
}
