import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User, UserCreate, UserUpdate, PaginationParams, PasswordReset } from '@/types'
import { usersApi } from '@/api'

export const useUsersStore = defineStore('users', () => {
  const users = ref<User[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers(params?: PaginationParams) {
    loading.value = true
    error.value = null
    try {
      const res = await usersApi.list(params)
      users.value = res.items
      total.value = res.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch users'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createUser(user: UserCreate): Promise<User> {
    const created = await usersApi.create(user)
    return created
  }

  async function updateUser(id: number, payload: UserUpdate): Promise<User> {
    const updated = await usersApi.update(id, payload)
    return updated
  }

  async function deactivateUser(id: number): Promise<void> {
    await usersApi.delete(id)
  }

  async function resetPassword(id: number, payload: PasswordReset): Promise<void> {
    await usersApi.resetPassword(id, payload)
  }

  return {
    users,
    total,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deactivateUser,
    resetPassword,
  }
})
