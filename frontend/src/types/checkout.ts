import type { InventoryRecord } from './inventory'
import type { User } from './user'

export type CheckoutStatus = 'active' | 'returned' | 'overdue'

export interface Checkout {
  id: number
  inventory_id: number
  user_id: number
  quantity: number
  checkout_date: string
  due_date: string
  return_date: string | null
  status: CheckoutStatus
  notes: string | null
  created_at: string
  updated_at: string
  inventory?: InventoryRecord
  user?: User
}

export interface CheckoutCreate {
  inventory_id: number
  quantity: number
  due_date: string
  notes?: string
  user_id?: number
}

export interface CheckoutReturn {
  quantity?: number
  notes?: string
}

export interface CheckoutExtend {
  due_date: string
}

export interface CheckoutFilters {
  status?: CheckoutStatus
  user_id?: number
  inventory_id?: number
}

export interface DashboardSummary {
  total_items: number
  active_checkouts: number
  overdue_count: number
  low_stock_count: number
}
