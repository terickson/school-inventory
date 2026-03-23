<template>
  <div data-testid="dashboard">
    <PageHeader title="Dashboard" subtitle="Overview of your inventory system" />

    <OverdueBanner :count="summary?.overdue_count ?? 0" />

    <!-- Stat Cards -->
    <v-row class="mb-4">
      <v-col cols="6" md="3">
        <v-card data-testid="stat-total-items" class="pa-4">
          <div class="d-flex align-center">
            <v-avatar color="primary" size="48" class="mr-3">
              <v-icon>mdi-package-variant-closed</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ summary?.total_items ?? 0 }}</div>
              <div class="text-caption text-grey">Total Items</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card data-testid="stat-active-checkouts" class="pa-4">
          <div class="d-flex align-center">
            <v-avatar color="info" size="48" class="mr-3">
              <v-icon>mdi-clipboard-check</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ summary?.active_checkouts ?? 0 }}</div>
              <div class="text-caption text-grey">Active Checkouts</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card data-testid="stat-overdue" class="pa-4">
          <div class="d-flex align-center">
            <v-avatar color="error" size="48" class="mr-3">
              <v-icon>mdi-alert-circle</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ summary?.overdue_count ?? 0 }}</div>
              <div class="text-caption text-grey">Overdue</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card data-testid="stat-low-stock" class="pa-4">
          <div class="d-flex align-center">
            <v-avatar color="warning" size="48" class="mr-3">
              <v-icon>mdi-alert-outline</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ summary?.low_stock_count ?? 0 }}</div>
              <div class="text-caption text-grey">Low Stock</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Actions -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-subtitle-1">Quick Actions</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="6" sm="3">
                <v-btn block color="primary" variant="outlined" :to="{ name: 'checkouts' }">
                  <v-icon start>mdi-clipboard-plus</v-icon>
                  New Checkout
                </v-btn>
              </v-col>
              <v-col cols="6" sm="3">
                <v-btn block color="secondary" variant="outlined" :to="{ name: 'inventory' }">
                  <v-icon start>mdi-package-variant</v-icon>
                  Inventory
                </v-btn>
              </v-col>
              <v-col cols="6" sm="3">
                <v-btn block color="warning" variant="outlined" :to="{ name: 'overdue' }">
                  <v-icon start>mdi-clock-alert</v-icon>
                  Overdue
                </v-btn>
              </v-col>
              <v-col cols="6" sm="3">
                <v-btn block color="info" variant="outlined" :to="{ name: 'catalog' }">
                  <v-icon start>mdi-magnify</v-icon>
                  Browse
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent Overdue & Low Stock -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-subtitle-1">
            <v-icon start color="error">mdi-alert-circle</v-icon>
            Overdue Checkouts
          </v-card-title>
          <v-card-text v-if="overdueList.length === 0">
            <p class="text-grey">No overdue checkouts</p>
          </v-card-text>
          <v-list v-else density="compact">
            <v-list-item
              v-for="c in overdueList"
              :key="c.id"
              :subtitle="`Due: ${formatDate(c.due_date)} - ${c.user?.full_name ?? 'Unknown'}`"
            >
              <v-list-item-title>
                {{ c.inventory?.item?.name ?? 'Item' }} (x{{ c.quantity }})
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-subtitle-1">
            <v-icon start color="warning">mdi-alert-outline</v-icon>
            Low Stock Items
          </v-card-title>
          <v-card-text v-if="lowStockItems.length === 0">
            <p class="text-grey">No low stock items</p>
          </v-card-text>
          <v-list v-else density="compact">
            <v-list-item
              v-for="inv in lowStockItems"
              :key="inv.id"
              :subtitle="`${inv.quantity} / ${inv.min_quantity} at ${inv.locator?.name ?? 'Unknown'}`"
            >
              <v-list-item-title>{{ inv.item?.name ?? 'Item' }}</v-list-item-title>
              <template #append>
                <StockLevelBadge :quantity="inv.quantity" :min-quantity="inv.min_quantity" />
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCheckoutStore } from '@/stores/checkout'
import { useInventoryStore } from '@/stores/inventory'
import type { Checkout, InventoryRecord, DashboardSummary } from '@/types'
import PageHeader from '@/components/common/PageHeader.vue'
import OverdueBanner from '@/components/checkout/OverdueBanner.vue'
import StockLevelBadge from '@/components/inventory/StockLevelBadge.vue'

const checkoutStore = useCheckoutStore()
const inventoryStore = useInventoryStore()

const summary = ref<DashboardSummary | null>(null)
const overdueList = ref<Checkout[]>([])
const lowStockItems = ref<InventoryRecord[]>([])

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}

onMounted(async () => {
  try {
    await checkoutStore.fetchSummary()
    summary.value = checkoutStore.summary

    await checkoutStore.fetchOverdue({ limit: 5 })
    overdueList.value = checkoutStore.overdueList

    await inventoryStore.fetchRecords({ low_stock: true, limit: 5 })
    lowStockItems.value = inventoryStore.records
  } catch {
    // handled by stores
  }
})
</script>
