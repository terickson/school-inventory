import api from './axios'
import type {
  PaginatedResponse,
  PaginationParams,
  Checkout,
  CheckoutCreate,
  CheckoutReturn,
  CheckoutExtend,
  CheckoutFilters,
  DashboardSummary,
} from '@/types'

export const checkoutApi = {
  async list(
    params?: PaginationParams & CheckoutFilters,
  ): Promise<PaginatedResponse<Checkout>> {
    const { data } = await api.get<PaginatedResponse<Checkout>>('/checkouts', { params })
    return data
  },

  async get(id: number): Promise<Checkout> {
    const { data } = await api.get<Checkout>(`/checkouts/${id}`)
    return data
  },

  async create(checkout: CheckoutCreate): Promise<Checkout> {
    const { data } = await api.post<Checkout>('/checkouts', checkout)
    return data
  },

  async returnCheckout(id: number, payload: CheckoutReturn): Promise<Checkout> {
    const { data } = await api.post<Checkout>(`/checkouts/${id}/return`, payload)
    return data
  },

  async extend(id: number, payload: CheckoutExtend): Promise<Checkout> {
    const { data } = await api.post<Checkout>(`/checkouts/${id}/extend`, payload)
    return data
  },

  async overdue(params?: PaginationParams): Promise<PaginatedResponse<Checkout>> {
    const { data } = await api.get<PaginatedResponse<Checkout>>('/checkouts/overdue', { params })
    return data
  },

  async summary(): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>('/checkouts/summary')
    return data
  },
}
