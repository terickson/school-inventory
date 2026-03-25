import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Checkout,
  CheckoutCreate,
  CheckoutReturn,
  CheckoutFilters,
  PaginationParams,
  DashboardSummary,
} from '@/types'
import { checkoutApi } from '@/api'

export const useCheckoutStore = defineStore('checkout', () => {
  const checkouts = ref<Checkout[]>([])
  const summary = ref<DashboardSummary | null>(null)
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCheckouts(params?: PaginationParams & CheckoutFilters) {
    loading.value = true
    error.value = null
    try {
      const res = await checkoutApi.list(params)
      checkouts.value = res.items
      total.value = res.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch checkouts'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    try {
      summary.value = await checkoutApi.summary()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch summary'
      throw e
    }
  }

  async function createCheckout(payload: CheckoutCreate): Promise<Checkout> {
    return await checkoutApi.create(payload)
  }

  async function returnCheckout(id: number, payload: CheckoutReturn): Promise<Checkout> {
    return await checkoutApi.returnCheckout(id, payload)
  }

  return {
    checkouts,
    summary,
    total,
    loading,
    error,
    fetchCheckouts,
    fetchSummary,
    createCheckout,
    returnCheckout,
  }
})
