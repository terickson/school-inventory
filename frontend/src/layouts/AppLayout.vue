<template>
  <v-app>
    <!-- Top App Bar -->
    <v-app-bar color="primary" density="comfortable">
      <v-app-bar-nav-icon
        v-if="isMobile"
        @click="drawer = !drawer"
      />
      <v-app-bar-title>
        <v-icon class="mr-2">mdi-school</v-icon>
        School Inventory
      </v-app-bar-title>
      <v-spacer />
      <v-btn icon @click="goToProfile">
        <v-icon>mdi-account-circle</v-icon>
      </v-btn>
      <v-btn icon @click="handleLogout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      :temporary="isMobile"
      :permanent="!isMobile"
      data-testid="nav-drawer"
    >
      <v-list density="compact" nav>
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="Dashboard"
          :to="{ name: 'dashboard' }"
          data-testid="nav-dashboard"
        />
        <v-list-item
          prepend-icon="mdi-map-marker"
          title="Locations"
          :to="{ name: 'locators' }"
          data-testid="nav-locators"
        />
        <v-list-item
          prepend-icon="mdi-book-open-variant"
          title="Catalog"
          :to="{ name: 'catalog' }"
          data-testid="nav-catalog"
        />
        <v-list-item
          prepend-icon="mdi-package-variant-closed"
          title="Inventory"
          :to="{ name: 'inventory' }"
          data-testid="nav-inventory"
        />
        <v-list-item
          prepend-icon="mdi-clipboard-check"
          title="Checkouts"
          :to="{ name: 'checkouts' }"
          data-testid="nav-checkouts"
        >
          <template #append v-if="overdueCount > 0">
            <v-badge :content="overdueCount" color="error" inline />
          </template>
        </v-list-item>
        <v-list-item
          v-if="authStore.isAdmin"
          prepend-icon="mdi-account-group"
          title="Users"
          :to="{ name: 'users' }"
          data-testid="nav-users"
        />
      </v-list>

      <template #append>
        <v-divider />
        <v-list-item class="pa-4">
          <v-list-item-title class="text-body-2">
            {{ authStore.user?.full_name || authStore.user?.username }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ authStore.user?.role }}
          </v-list-item-subtitle>
        </v-list-item>
      </template>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main>
      <v-container fluid class="page-container">
        <slot />
      </v-container>
    </v-main>

    <!-- Bottom Navigation (mobile) -->
    <v-bottom-navigation v-if="isMobile" grow color="primary">
      <v-btn :to="{ name: 'dashboard' }">
        <v-icon>mdi-view-dashboard</v-icon>
        <span>Home</span>
      </v-btn>
      <v-btn :to="{ name: 'inventory' }">
        <v-icon>mdi-package-variant-closed</v-icon>
        <span>Inventory</span>
      </v-btn>
      <v-btn :to="{ name: 'checkouts' }">
        <v-icon>mdi-clipboard-check</v-icon>
        <span>Checkout</span>
      </v-btn>
      <v-btn :to="{ name: 'catalog' }">
        <v-icon>mdi-book-open-variant</v-icon>
        <span>Catalog</span>
      </v-btn>
    </v-bottom-navigation>

    <!-- Global Snackbar -->
    <v-snackbar
      v-model="notify.snackbar.value"
      :color="notify.notification.value.color"
      :timeout="notify.notification.value.timeout"
      location="top"
    >
      {{ notify.notification.value.message }}
      <template #actions>
        <v-btn variant="text" @click="notify.snackbar.value = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Global Confirm Dialog -->
    <ConfirmDialog />
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCheckoutStore } from '@/stores/checkout'
import { useBreakpoint, useNotify } from '@/composables'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const authStore = useAuthStore()
const checkoutStore = useCheckoutStore()
const router = useRouter()
const { isMobile } = useBreakpoint()
const notify = useNotify()

const drawer = ref(!isMobile.value)
const overdueCount = ref(0)

onMounted(async () => {
  try {
    await checkoutStore.fetchSummary()
    overdueCount.value = checkoutStore.summary?.overdue_count ?? 0
  } catch {
    // ignore
  }
})

function goToProfile() {
  router.push({ name: 'profile' })
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>
