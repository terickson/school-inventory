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
  quantity_change: number
  reason: string
}

export interface InventoryFilters {
  locator_id?: number
  item_id?: number
  low_stock?: boolean
  search?: string
}
