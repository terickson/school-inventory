import api from './axios'
import type { TokenResponse, User } from '@/types'

export const authApi = {
  async login(username: string, password: string): Promise<TokenResponse> {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    const { data } = await api.post<TokenResponse>('/auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me')
    return data
  },
}
