import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Locator,
  LocatorCreate,
  LocatorUpdate,
  Sublocator,
  SublocatorCreate,
  SublocatorUpdate,
  PaginationParams,
} from '@/types'
import { locatorsApi } from '@/api'

export const useLocatorsStore = defineStore('locators', () => {
  const locators = ref<Locator[]>([])
  const currentLocator = ref<Locator | null>(null)
  const sublocators = ref<Sublocator[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchLocators(params?: PaginationParams) {
    loading.value = true
    error.value = null
    try {
      const res = await locatorsApi.list(params)
      locators.value = res.items
      total.value = res.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch locators'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchLocator(id: number) {
    loading.value = true
    try {
      currentLocator.value = await locatorsApi.get(id)
      // Also fetch sublocators for this locator
      await fetchSublocators(id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch locator'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createLocator(payload: LocatorCreate): Promise<Locator> {
    return await locatorsApi.create(payload)
  }

  async function updateLocator(id: number, payload: LocatorUpdate): Promise<Locator> {
    return await locatorsApi.update(id, payload)
  }

  async function deleteLocator(id: number): Promise<void> {
    await locatorsApi.delete(id)
  }

  async function fetchSublocators(locatorId: number) {
    const res = await locatorsApi.listSublocators(locatorId)
    sublocators.value = res.items
  }

  async function createSublocator(locatorId: number, payload: SublocatorCreate): Promise<Sublocator> {
    return await locatorsApi.createSublocator(locatorId, payload)
  }

  async function updateSublocator(locatorId: number, subId: number, payload: SublocatorUpdate): Promise<Sublocator> {
    return await locatorsApi.updateSublocator(locatorId, subId, payload)
  }

  async function deleteSublocator(locatorId: number, subId: number): Promise<void> {
    await locatorsApi.deleteSublocator(locatorId, subId)
  }

  return {
    locators,
    currentLocator,
    sublocators,
    total,
    loading,
    error,
    fetchLocators,
    fetchLocator,
    createLocator,
    updateLocator,
    deleteLocator,
    fetchSublocators,
    createSublocator,
    updateSublocator,
    deleteSublocator,
  }
})
