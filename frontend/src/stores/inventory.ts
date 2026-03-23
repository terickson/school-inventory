import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  InventoryRecord,
  InventoryCreate,
  InventoryUpdate,
  InventoryAdjust,
  InventoryFilters,
  PaginationParams,
} from '@/types'
import { inventoryApi } from '@/api'

export const useInventoryStore = defineStore('inventory', () => {
  const records = ref<InventoryRecord[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchRecords(params?: PaginationParams & InventoryFilters) {
    loading.value = true
    error.value = null
    try {
      const res = await inventoryApi.list(params)
      records.value = res.items
      total.value = res.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch inventory'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createRecord(payload: InventoryCreate): Promise<InventoryRecord> {
    return await inventoryApi.create(payload)
  }

  async function updateRecord(id: number, payload: InventoryUpdate): Promise<InventoryRecord> {
    return await inventoryApi.update(id, payload)
  }

  async function deleteRecord(id: number): Promise<void> {
    await inventoryApi.delete(id)
  }

  async function adjustStock(id: number, payload: InventoryAdjust): Promise<InventoryRecord> {
    return await inventoryApi.adjust(id, payload)
  }

  return {
    records,
    total,
    loading,
    error,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    adjustStock,
  }
})
