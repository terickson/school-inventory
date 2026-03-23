import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { authApi } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!accessToken.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isTeacher = computed(() => user.value?.role === 'teacher')

  async function login(username: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const tokens = await authApi.login(username, password)
      accessToken.value = tokens.access_token
      refreshToken.value = tokens.refresh_token
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)
      await fetchProfile()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Login failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    try {
      user.value = await authApi.me()
    } catch (e) {
      user.value = null
      throw e
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // ignore
    } finally {
      user.value = null
      accessToken.value = null
      refreshToken.value = null
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }

  async function initialize() {
    if (accessToken.value) {
      try {
        await fetchProfile()
      } catch {
        await logout()
      }
    }
  }

  return {
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isTeacher,
    login,
    logout,
    fetchProfile,
    initialize,
  }
})
