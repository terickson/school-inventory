<template>
  <div>
    <PageHeader title="Inventory" subtitle="Track stock levels across locations">
      <template #actions>
        <v-btn v-if="authStore.isAdmin" color="primary" data-testid="add-inventory-btn" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Add Stock
        </v-btn>
      </template>
    </PageHeader>

    <v-card>
      <v-data-table-server
        data-testid="inventory-table"
        :headers="headers"
        :items="inventoryStore.records"
        :items-length="inventoryStore.total"
        :loading="inventoryStore.loading"
        :items-per-page="itemsPerPage"
        :page="page"
        @update:page="page = $event"
        @update:items-per-page="itemsPerPage = $event"
        @update:options="loadItems"
      >
        <template #top>
          <v-toolbar flat>
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search inventory..."
              hide-details
              density="compact"
              class="mx-4"
              style="max-width: 250px"
              @update:model-value="debouncedSearch"
            />
            <v-select
              v-model="locatorFilter"
              :items="locatorOptions"
              item-title="name"
              item-value="id"
              label="Location"
              hide-details
              density="compact"
              clearable
              class="mx-2"
              style="max-width: 180px"
              @update:model-value="() => loadItems()"
            />
            <v-checkbox
              v-model="lowStockOnly"
              label="Low stock only"
              hide-details
              density="compact"
              class="mx-2"
              @update:model-value="() => loadItems()"
            />
          </v-toolbar>
        </template>

        <template #item.item="{ item }">
          {{ item.item?.name ?? 'Unknown' }}
        </template>

        <template #item.location="{ item }">
          {{ item.locator?.name ?? '' }}{{ item.sublocator ? ' / ' + item.sublocator.name : '' }}
        </template>

        <template #item.stock="{ item }">
          <StockLevelBadge :quantity="item.quantity" :min-quantity="item.min_quantity" />
        </template>

        <template #item.actions="{ item }">
          <v-btn icon size="small" variant="text" @click="openAdjust(item)">
            <v-icon>mdi-tune</v-icon>
            <v-tooltip activator="parent" location="top">Adjust stock</v-tooltip>
          </v-btn>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- Create Inventory Dialog -->
    <FormDialog
      v-model="createDialogOpen"
      title="Add Inventory Record"
      :loading="saving"
      @save="handleCreate"
      @cancel="createDialogOpen = false"
    >
      <v-autocomplete
        v-model="createForm.item_id"
        :items="catalogItems"
        :loading="catalogItemsLoading"
        item-title="name"
        item-value="id"
        label="Item"
        placeholder="Type to search items..."
        :rules="[(v: number | null) => v !== null || 'Required']"
        @update:search="debouncedItemSearch"
      />
      <v-select
        v-model="createForm.locator_id"
        :items="locatorOptions"
        item-title="name"
        item-value="id"
        label="Location"
        :rules="[(v: number | null) => v !== null || 'Required']"
      />
      <v-select
        v-model="createForm.sublocator_id"
        :items="sublocatorOptions"
        item-title="name"
        item-value="id"
        label="Shelf (optional)"
        clearable
      />
      <v-text-field
        v-model.number="createForm.quantity"
        label="Quantity"
        type="number"
        min="0"
        :rules="[(v: number) => v >= 0 || 'Cannot be negative']"
      />
      <v-text-field
        v-model.number="createForm.min_quantity"
        label="Minimum Quantity"
        type="number"
        min="0"
      />
    </FormDialog>

    <!-- Adjust Stock Dialog -->
    <FormDialog
      v-model="adjustDialogOpen"
      title="Adjust Stock"
      :loading="saving"
      @save="handleAdjust"
      @cancel="adjustDialogOpen = false"
    >
      <InventoryAdjustForm ref="adjustFormRef" />
    </FormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import { useLocatorsStore } from '@/stores/locators'
import { useCatalogStore } from '@/stores/catalog'
import { useNotify } from '@/composables'
import type { InventoryRecord } from '@/types'
import PageHeader from '@/components/common/PageHeader.vue'
import FormDialog from '@/components/common/FormDialog.vue'
import StockLevelBadge from '@/components/inventory/StockLevelBadge.vue'
import InventoryAdjustForm from '@/components/inventory/InventoryAdjustForm.vue'

const authStore = useAuthStore()
const inventoryStore = useInventoryStore()
const locatorsStore = useLocatorsStore()
const catalogStore = useCatalogStore()
const notify = useNotify()

const page = ref(1)
const itemsPerPage = ref(20)
const search = ref('')
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([])
const locatorFilter = ref<number | null>(null)
const lowStockOnly = ref(false)
const createDialogOpen = ref(false)
const adjustDialogOpen = ref(false)
const saving = ref(false)
const adjustingRecord = ref<InventoryRecord | null>(null)
const adjustFormRef = ref<InstanceType<typeof InventoryAdjustForm>>()

const locatorOptions = ref<{ id: number; name: string }[]>([])
const sublocatorOptions = ref<{ id: number; name: string }[]>([])
const catalogItems = ref<{ id: number; name: string }[]>([])
const catalogItemsLoading = ref(false)

const createForm = reactive({
  item_id: null as number | null,
  locator_id: null as number | null,
  sublocator_id: null as number | null,
  quantity: 0,
  min_quantity: 0,
})

let searchTimeout: ReturnType<typeof setTimeout>

const headers = [
  { title: 'Item', key: 'item', sortable: false },
  { title: 'Location', key: 'location', sortable: false },
  { title: 'Stock', key: 'stock', sortable: false },
  { title: 'Quantity', key: 'quantity', sortable: true },
  { title: 'Min', key: 'min_quantity', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

let itemSearchTimeout: ReturnType<typeof setTimeout>

async function searchCatalogItems(query?: string) {
  catalogItemsLoading.value = true
  try {
    await catalogStore.fetchItems({ limit: 100, search: query || undefined })
    catalogItems.value = catalogStore.items.map((i) => ({ id: i.id, name: i.name }))
  } finally {
    catalogItemsLoading.value = false
  }
}

function debouncedItemSearch(query: string) {
  clearTimeout(itemSearchTimeout)
  itemSearchTimeout = setTimeout(() => {
    searchCatalogItems(query)
  }, 300)
}

onMounted(async () => {
  await locatorsStore.fetchLocators({ limit: 100 })
  locatorOptions.value = locatorsStore.locators.map((l) => ({ id: l.id, name: l.name }))
  await searchCatalogItems()
})

watch(() => createForm.locator_id, async (id) => {
  if (id) {
    await locatorsStore.fetchSublocators(id)
    sublocatorOptions.value = locatorsStore.sublocators.map((s) => ({ id: s.id, name: s.name }))
  } else {
    sublocatorOptions.value = []
  }
})

function loadItems(options?: { sortBy?: { key: string; order: 'asc' | 'desc' }[] }) {
  if (options?.sortBy) sortBy.value = options.sortBy
  const sort = sortBy.value[0]
  inventoryStore.fetchRecords({
    skip: (page.value - 1) * itemsPerPage.value,
    limit: itemsPerPage.value,
    search: search.value || undefined,
    locator_id: locatorFilter.value ?? undefined,
    low_stock: lowStockOnly.value || undefined,
    sort_by: sort?.key,
    sort_order: sort?.order,
  })
}

function debouncedSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    loadItems()
  }, 300)
}

function openCreate() {
  createForm.item_id = null
  createForm.locator_id = null
  createForm.sublocator_id = null
  createForm.quantity = 0
  createForm.min_quantity = 0
  createDialogOpen.value = true
}

function openAdjust(record: InventoryRecord) {
  adjustingRecord.value = record
  adjustDialogOpen.value = true
}

async function handleCreate() {
  if (!createForm.item_id || !createForm.locator_id) return
  saving.value = true
  try {
    await inventoryStore.createRecord({
      item_id: createForm.item_id,
      locator_id: createForm.locator_id,
      sublocator_id: createForm.sublocator_id,
      quantity: createForm.quantity,
      min_quantity: createForm.min_quantity,
    })
    notify.success('Inventory record created')
    createDialogOpen.value = false
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to create inventory record')
  } finally {
    saving.value = false
  }
}

async function handleAdjust() {
  if (!adjustFormRef.value || !adjustingRecord.value) return
  const valid = await adjustFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const data = adjustFormRef.value.getData()
    await inventoryStore.adjustStock(adjustingRecord.value.id, data)
    notify.success('Stock adjusted')
    adjustDialogOpen.value = false
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to adjust stock')
  } finally {
    saving.value = false
  }
}
</script>
