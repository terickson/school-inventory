import api from './axios'
import type { PaginatedResponse, PaginationParams, User, UserCreate, UserUpdate, PasswordReset, PasswordChange } from '@/types'

export const usersApi = {
  async list(params?: PaginationParams): Promise<PaginatedResponse<User>> {
    const { data } = await api.get<PaginatedResponse<User>>('/users', { params })
    return data
  },

  async get(id: number): Promise<User> {
    const { data } = await api.get<User>(`/users/${id}`)
    return data
  },

  async create(user: UserCreate): Promise<User> {
    const { data } = await api.post<User>('/users', user)
    return data
  },

  async update(id: number, user: UserUpdate): Promise<User> {
    const { data } = await api.patch<User>(`/users/${id}`, user)
    return data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/users/${id}`)
  },

  async resetPassword(id: number, payload: PasswordReset): Promise<void> {
    await api.post(`/users/${id}/reset-password`, payload)
  },

  async updateMe(payload: Partial<{ email: string; full_name: string }>): Promise<User> {
    const { data } = await api.patch<User>('/users/me', payload)
    return data
  },

  async changePassword(payload: PasswordChange): Promise<void> {
    await api.patch('/users/me', payload)
  },
}
