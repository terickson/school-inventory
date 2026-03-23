import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { public: true, layout: 'auth' },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/dashboard/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/admin/UsersView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/locators',
      name: 'locators',
      component: () => import('@/views/locators/LocatorsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/locators/:id',
      name: 'locator-detail',
      component: () => import('@/views/locators/LocatorDetailView.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/catalog',
      name: 'catalog',
      component: () => import('@/views/catalog/CatalogView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: () => import('@/views/inventory/InventoryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/checkouts',
      name: 'checkouts',
      component: () => import('@/views/checkout/CheckoutView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/checkouts/overdue',
      name: 'overdue',
      component: () => import('@/views/checkout/OverdueView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/profile/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

let initialized = false

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!initialized) {
    initialized = true
    await authStore.initialize()
  }

  if (to.meta.public) {
    if (authStore.isAuthenticated && to.name === 'login') {
      return { name: 'dashboard' }
    }
    return true
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
