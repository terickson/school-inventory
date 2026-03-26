import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Mock all view components to avoid loading real ones
vi.mock('@/views/auth/LoginView.vue', () => ({ default: { template: '<div>Login</div>' } }))
vi.mock('@/views/dashboard/DashboardView.vue', () => ({ default: { template: '<div>Dashboard</div>' } }))
vi.mock('@/views/admin/UsersView.vue', () => ({ default: { template: '<div>Users</div>' } }))
vi.mock('@/views/locators/LocatorsView.vue', () => ({ default: { template: '<div>Locators</div>' } }))
vi.mock('@/views/locators/LocatorDetailView.vue', () => ({ default: { template: '<div>Detail</div>' } }))
vi.mock('@/views/catalog/CatalogView.vue', () => ({ default: { template: '<div>Catalog</div>' } }))
vi.mock('@/views/catalog/CategoriesView.vue', () => ({ default: { template: '<div>Categories</div>' } }))
vi.mock('@/views/inventory/InventoryView.vue', () => ({ default: { template: '<div>Inventory</div>' } }))
vi.mock('@/views/checkout/CheckoutView.vue', () => ({ default: { template: '<div>Checkout</div>' } }))
vi.mock('@/views/profile/ProfileView.vue', () => ({ default: { template: '<div>Profile</div>' } }))

vi.mock('@/api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}))

import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types'

const adminUser: User = {
  id: 1,
  username: 'admin',
  full_name: 'Admin',
  role: 'admin',
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

const teacherUser: User = {
  ...adminUser,
  id: 2,
  username: 'teacher',
  role: 'teacher',
}

describe('Router navigation guards', () => {
  let router: typeof import('@/router').default

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    setActivePinia(createPinia())

    // Re-import router to reset the module-level `initialized` flag
    const mod = await import('@/router/index')
    router = mod.default
  })

  it('redirects unauthenticated user to /login with redirect param', async () => {
    const store = useAuthStore()
    store.accessToken = null

    router.push('/catalog')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/catalog')
  })

  it('allows unauthenticated user to access /login', async () => {
    const store = useAuthStore()
    store.accessToken = null

    router.push('/login')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('redirects authenticated user away from /login to dashboard', async () => {
    // Mock me() so initialize() keeps the user authenticated
    vi.mocked(authApi.me).mockResolvedValue(adminUser)

    const store = useAuthStore()
    store.accessToken = 'token'

    router.push('/login')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('allows authenticated user to access protected routes', async () => {
    vi.mocked(authApi.me).mockResolvedValue(teacherUser)

    const store = useAuthStore()
    store.accessToken = 'token'

    router.push('/catalog')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('catalog')
  })

  it('redirects non-admin from admin routes to dashboard', async () => {
    vi.mocked(authApi.me).mockResolvedValue(teacherUser)

    const store = useAuthStore()
    store.accessToken = 'token'

    router.push('/users')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('allows admin to access admin routes', async () => {
    vi.mocked(authApi.me).mockResolvedValue(adminUser)

    const store = useAuthStore()
    store.accessToken = 'token'

    router.push('/users')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('users')
  })

  it('allows non-admin to access /categories', async () => {
    vi.mocked(authApi.me).mockResolvedValue(teacherUser)

    const store = useAuthStore()
    store.accessToken = 'token'

    router.push('/categories')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('categories')
  })

  it('redirects unknown routes to /', async () => {
    vi.mocked(authApi.me).mockResolvedValue(adminUser)

    const store = useAuthStore()
    store.accessToken = 'token'

    router.push('/nonexistent-route')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('dashboard')
  })
})
