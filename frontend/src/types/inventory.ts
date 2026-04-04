import type { Item } from './catalog'
import type { Locator, Sublocator } from './locator'

export interface InventoryRecord {
  id: number
  item_id: number
  locator_id: number
  sublocator_id: number | null
  quantity: number
  min_quantity: number
  created_at: string
  updated_at: string
  item?: Item
  locator?: Locator
  sublocator?: Sublocator | null
}

export interface InventoryCreate {
  item_id: number
  locator_id: number
  sublocator_id?: number | null
  quantity: number
  min_quantity?: number
}

export interface InventoryUpdate {
  quantity?: number
  min_quantity?: number
}

export interface InventoryAdjust {
  adjustment: number
  reason: string
}

export interface InventoryFilters {
  locator_id?: number
  item_id?: number
  low_stock?: boolean
  search?: string
}

export interface QuickAddRequest {
  item_id?: number | null
  item_name?: string | null
  category_id?: number | null
  unit_of_measure?: string
  locator_id: number
  sublocator_id?: number | null
  quantity: number
  min_quantity?: number
}

export interface QuickAddResponse {
  inventory: InventoryRecord
  item_created: boolean
  item: { id: number; name: string; unit_of_measure: string | null }
}

export interface ImportRowError {
  row: number
  item_name: string | null
  error: string
}

export interface ImportResult {
  total_rows: number
  created: number
  updated: number
  errors: ImportRowError[]
}
