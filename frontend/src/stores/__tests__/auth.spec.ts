import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import type { User, TokenResponse } from '@/types'

vi.mock('@/api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}))

import { authApi } from '@/api'

const mockUser: User = {
  id: 1,
  username: 'admin',
  email: 'admin@test.com',
  full_name: 'Admin User',
  role: 'admin',
  is_active: true,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
}

const mockTeacher: User = {
  ...mockUser,
  id: 2,
  username: 'teacher1',
  role: 'teacher',
}

const mockTokens: TokenResponse = {
  access_token: 'access-123',
  refresh_token: 'refresh-456',
  token_type: 'bearer',
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('Auth Store', () => {
  describe('computed properties', () => {
    it('isAuthenticated returns false when no token', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })

    it('isAuthenticated returns true when accessToken is set', () => {
      const store = useAuthStore()
      store.accessToken = 'some-token'
      expect(store.isAuthenticated).toBe(true)
    })

    it('isAdmin returns true only for admin role', () => {
      const store = useAuthStore()
      store.user = mockUser
      expect(store.isAdmin).toBe(true)
      expect(store.isTeacher).toBe(false)
    })

    it('isTeacher returns true only for teacher role', () => {
      const store = useAuthStore()
      store.user = mockTeacher
      expect(store.isTeacher).toBe(true)
      expect(store.isAdmin).toBe(false)
    })

    it('isAdmin and isTeacher are false when no user', () => {
      const store = useAuthStore()
      expect(store.isAdmin).toBe(false)
      expect(store.isTeacher).toBe(false)
    })
  })

  describe('login()', () => {
    it('stores tokens, fetches profile, and sets loading states', async () => {
      vi.mocked(authApi.login).mockResolvedValue(mockTokens)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)

      const store = useAuthStore()
      expect(store.loading).toBe(false)

      await store.login('admin', 'password')

      expect(authApi.login).toHaveBeenCalledWith('admin', 'password')
      expect(store.accessToken).toBe('access-123')
      expect(store.refreshToken).toBe('refresh-456')
      expect(localStorage.getItem('access_token')).toBe('access-123')
      expect(localStorage.getItem('refresh_token')).toBe('refresh-456')
      expect(store.user).toEqual(mockUser)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('sets error and re-throws on failure', async () => {
      vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'))

      const store = useAuthStore()
      await expect(store.login('bad', 'creds')).rejects.toThrow('Invalid credentials')

      expect(store.error).toBe('Invalid credentials')
      expect(store.loading).toBe(false)
      expect(store.accessToken).toBeNull()
    })
  })

  describe('fetchProfile()', () => {
    it('sets user from API response', async () => {
      vi.mocked(authApi.me).mockResolvedValue(mockUser)

      const store = useAuthStore()
      await store.fetchProfile()

      expect(store.user).toEqual(mockUser)
    })

    it('nullifies user and re-throws on failure', async () => {
      vi.mocked(authApi.me).mockRejectedValue(new Error('Forbidden'))

      const store = useAuthStore()
      store.user = mockUser

      await expect(store.fetchProfile()).rejects.toThrow('Forbidden')
      expect(store.user).toBeNull()
    })
  })

  describe('logout()', () => {
    it('clears all auth state and localStorage', async () => {
      vi.mocked(authApi.logout).mockResolvedValue()

      const store = useAuthStore()
      store.user = mockUser
      store.accessToken = 'token'
      store.refreshToken = 'refresh'
      localStorage.setItem('access_token', 'token')
      localStorage.setItem('refresh_token', 'refresh')

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.accessToken).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
    })

    it('clears state even when API call fails', async () => {
      vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'))

      const store = useAuthStore()
      store.user = mockUser
      store.accessToken = 'token'
      localStorage.setItem('access_token', 'token')

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.accessToken).toBeNull()
      expect(localStorage.getItem('access_token')).toBeNull()
    })
  })

  describe('initialize()', () => {
    it('fetches profile when access token exists', async () => {
      localStorage.setItem('access_token', 'stored-token')
      // Re-create pinia so the store reads the token from localStorage
      setActivePinia(createPinia())
      vi.mocked(authApi.me).mockResolvedValue(mockUser)

      const store = useAuthStore()
      await store.initialize()

      expect(authApi.me).toHaveBeenCalled()
      expect(store.user).toEqual(mockUser)
    })

    it('calls logout when fetchProfile fails', async () => {
      localStorage.setItem('access_token', 'stored-token')
      setActivePinia(createPinia())
      vi.mocked(authApi.me).mockRejectedValue(new Error('Expired'))
      vi.mocked(authApi.logout).mockResolvedValue()

      const store = useAuthStore()
      await store.initialize()

      expect(store.user).toBeNull()
      expect(store.accessToken).toBeNull()
      expect(localStorage.getItem('access_token')).toBeNull()
    })

    it('does nothing when no access token', async () => {
      const store = useAuthStore()
      await store.initialize()

      expect(authApi.me).not.toHaveBeenCalled()
      expect(store.user).toBeNull()
    })
  })
})
