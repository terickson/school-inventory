import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUsersStore } from '../users'

vi.mock('@/api', () => ({
  usersApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    resetPassword: vi.fn(),
  },
}))

import { usersApi } from '@/api'

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

describe('Users Store', () => {
  it('fetchUsers populates users and total', async () => {
    vi.mocked(usersApi.list).mockResolvedValue({ items: [{ id: 1, username: 'admin' }], total: 1, skip: 0, limit: 20 } as any)

    const store = useUsersStore()
    await store.fetchUsers()

    expect(store.users).toHaveLength(1)
    expect(store.total).toBe(1)
    expect(store.loading).toBe(false)
  })

  it('fetchUsers sets error on failure', async () => {
    vi.mocked(usersApi.list).mockRejectedValue(new Error('Forbidden'))

    const store = useUsersStore()
    await expect(store.fetchUsers()).rejects.toThrow('Forbidden')
    expect(store.error).toBe('Forbidden')
  })

  it('createUser delegates to API', async () => {
    const user = { id: 2, username: 'newuser' }
    vi.mocked(usersApi.create).mockResolvedValue(user as any)

    const store = useUsersStore()
    const result = await store.createUser({ username: 'newuser', full_name: 'New', password: 'pass123', role: 'teacher' })

    expect(result).toEqual(user)
  })

  it('updateUser delegates to API', async () => {
    const updated = { id: 1, full_name: 'Updated' }
    vi.mocked(usersApi.update).mockResolvedValue(updated as any)

    const store = useUsersStore()
    const result = await store.updateUser(1, { full_name: 'Updated' })

    expect(usersApi.update).toHaveBeenCalledWith(1, { full_name: 'Updated' })
    expect(result).toEqual(updated)
  })

  it('deactivateUser delegates to API delete', async () => {
    vi.mocked(usersApi.delete).mockResolvedValue()

    const store = useUsersStore()
    await store.deactivateUser(1)

    expect(usersApi.delete).toHaveBeenCalledWith(1)
  })

  it('resetPassword delegates to API', async () => {
    vi.mocked(usersApi.resetPassword).mockResolvedValue()

    const store = useUsersStore()
    await store.resetPassword(1, { new_password: 'newpass123' })

    expect(usersApi.resetPassword).toHaveBeenCalledWith(1, { new_password: 'newpass123' })
  })
})
