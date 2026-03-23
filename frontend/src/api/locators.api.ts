import api from './axios'
import type {
  PaginatedResponse,
  PaginationParams,
  Locator,
  LocatorCreate,
  LocatorUpdate,
  Sublocator,
  SublocatorCreate,
  SublocatorUpdate,
} from '@/types'

export const locatorsApi = {
  async list(params?: PaginationParams): Promise<PaginatedResponse<Locator>> {
    const { data } = await api.get<PaginatedResponse<Locator>>('/locators', { params })
    return data
  },

  async get(id: number): Promise<Locator> {
    const { data } = await api.get<Locator>(`/locators/${id}`)
    return data
  },

  async create(locator: LocatorCreate): Promise<Locator> {
    const { data } = await api.post<Locator>('/locators', locator)
    return data
  },

  async update(id: number, locator: LocatorUpdate): Promise<Locator> {
    const { data } = await api.patch<Locator>(`/locators/${id}`, locator)
    return data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/locators/${id}`)
  },

  // Sublocators
  async listSublocators(locatorId: number): Promise<PaginatedResponse<Sublocator>> {
    const { data } = await api.get<PaginatedResponse<Sublocator>>(
      `/locators/${locatorId}/sublocators`,
    )
    return data
  },

  async createSublocator(locatorId: number, sub: SublocatorCreate): Promise<Sublocator> {
    const { data } = await api.post<Sublocator>(`/locators/${locatorId}/sublocators`, sub)
    return data
  },

  async updateSublocator(
    locatorId: number,
    subId: number,
    sub: SublocatorUpdate,
  ): Promise<Sublocator> {
    const { data } = await api.patch<Sublocator>(
      `/locators/${locatorId}/sublocators/${subId}`,
      sub,
    )
    return data
  },

  async deleteSublocator(locatorId: number, subId: number): Promise<void> {
    await api.delete(`/locators/${locatorId}/sublocators/${subId}`)
  },
}
