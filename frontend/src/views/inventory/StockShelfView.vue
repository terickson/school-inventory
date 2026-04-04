<template>
  <div>
    <PageHeader title="Stock a Shelf" subtitle="Rapidly add items to a location">
      <template #actions>
        <v-btn variant="text" :to="{ name: 'inventory' }" data-testid="back-to-inventory">
          <v-icon start>mdi-arrow-left</v-icon>
          Inventory
        </v-btn>
      </template>
    </PageHeader>

    <!-- Location / Shelf selectors (sticky) -->
    <v-card class="mb-4 stock-shelf-location" data-testid="location-selector">
      <v-card-text>
        <div :class="isMobile ? 'd-flex flex-column ga-2' : 'd-flex ga-2'">
          <v-select
            v-model="selectedLocatorId"
            :items="locatorOptions"
            item-title="name"
            item-value="id"
            label="Location"
            hide-details
            density="compact"
            data-testid="stock-locator-select"
            :style="isMobile ? '' : 'max-width: 300px'"
          />
          <v-select
            v-model="selectedSublocatorId"
            :items="sublocatorOptions"
            item-title="name"
            item-value="id"
            label="Shelf (optional)"
            hide-details
            density="compact"
            clearable
            data-testid="stock-sublocator-select"
            :style="isMobile ? '' : 'max-width: 300px'"
          />
        </div>
      </v-card-text>
    </v-card>

    <!-- Entry form -->
    <v-card class="mb-4" data-testid="quick-add-form">
      <v-card-text>
        <v-autocomplete
          ref="itemInputRef"
          v-model="selectedItem"
          v-model:search="itemSearch"
          :items="itemOptions"
          :loading="itemsLoading"
          item-title="name"
          item-value="id"
          label="Search or add item..."
          placeholder="Type to search catalog..."
          hide-details
          density="compact"
          return-object
          no-filter
          class="mb-3"
          data-testid="stock-item-input"
          @update:search="debouncedItemSearch"
        >
          <template #no-data>
            <v-list-item v-if="itemSearch && itemSearch.length >= 2">
              <v-list-item-title>
                No match found.
              </v-list-item-title>
            </v-list-item>
          </template>
          <template #append-item>
            <v-list-item
              v-if="itemSearch && itemSearch.length >= 2 && !exactMatch"
              data-testid="create-new-item-option"
              @click="selectNewItem"
            >
              <v-list-item-title class="text-primary font-weight-medium">
                + Create new: "{{ itemSearch }}"
              </v-list-item-title>
            </v-list-item>
          </template>
        </v-autocomplete>

        <!-- New item fields (only when creating) -->
        <div v-if="isCreatingNew" class="mb-3" data-testid="new-item-fields">
          <div :class="isMobile ? 'd-flex flex-column ga-2' : 'd-flex ga-2'">
            <v-select
              v-model="newItemCategoryId"
              :items="categories"
              item-title="name"
              item-value="id"
              label="Category"
              hide-details
              density="compact"
              data-testid="stock-category-select"
            />
            <v-select
              v-model="newItemUnit"
              :items="unitOptions"
              label="Unit"
              hide-details
              density="compact"
              data-testid="stock-unit-select"
              :style="isMobile ? '' : 'max-width: 180px'"
            />
          </div>
        </div>

        <div class="d-flex ga-2 align-center">
          <v-text-field
            v-model.number="quantity"
            label="Qty"
            type="number"
            min="1"
            inputmode="numeric"
            hide-details
            density="compact"
            data-testid="stock-quantity-input"
            style="max-width: 120px"
            @keydown.enter="handleAdd"
          />
          <v-btn
            color="primary"
            :loading="adding"
            :disabled="!canAdd"
            data-testid="stock-add-btn"
            size="large"
            @click="handleAdd"
          >
            <v-icon start>mdi-plus</v-icon>
            Add
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Session list -->
    <v-card v-if="sessionEntries.length > 0" data-testid="session-list">
      <v-card-title class="text-body-1">
        Added this session ({{ sessionEntries.length }})
      </v-card-title>
      <v-list density="compact">
        <v-list-item
          v-for="(entry, index) in sessionEntries"
          :key="index"
          :data-testid="`session-entry-${index}`"
        >
          <v-list-item-title>
            {{ entry.itemName }}
            <v-chip size="x-small" class="ml-1">x{{ entry.quantity }}</v-chip>
            <v-chip v-if="entry.itemCreated" size="x-small" color="success" class="ml-1">new</v-chip>
          </v-list-item-title>
          <template #append>
            <v-btn
              icon
              size="x-small"
              variant="text"
              :loading="entry.undoing"
              data-testid="undo-btn"
              @click="undoEntry(index)"
            >
              <v-icon>mdi-undo</v-icon>
              <v-tooltip activator="parent" location="top">Undo</v-tooltip>
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useLocatorsStore } from '@/stores/locators'
import { useNotify, useBreakpoint } from '@/composables'
import { catalogApi } from '@/api'
import type { Category } from '@/types'
import PageHeader from '@/components/common/PageHeader.vue'

interface SessionEntry {
  inventoryId: number
  itemName: string
  quantity: number
  itemCreated: boolean
  undoing: boolean
}

interface ItemOption {
  id: number
  name: string
}

const inventoryStore = useInventoryStore()
const locatorsStore = useLocatorsStore()
const notify = useNotify()
const { isMobile } = useBreakpoint()

// Location state
const selectedLocatorId = ref<number | null>(null)
const selectedSublocatorId = ref<number | null>(null)
const locatorOptions = ref<{ id: number; name: string }[]>([])
const sublocatorOptions = ref<{ id: number; name: string }[]>([])

// Item input state
const itemInputRef = ref<any>(null)
const selectedItem = ref<ItemOption | null>(null)
const itemSearch = ref('')
const itemOptions = ref<ItemOption[]>([])
const itemsLoading = ref(false)
const isCreatingNew = ref(false)
const newItemName = ref('')
const newItemCategoryId = ref<number | null>(null)
const newItemUnit = ref('unit')

// Form state
const quantity = ref(1)
const adding = ref(false)
const categories = ref<Category[]>([])

// Session tracking
const sessionEntries = ref<SessionEntry[]>([])

const unitOptions = [
  'unit', 'set', 'pair', 'pack', 'kit', 'roll', 'spool', 'bag', 'pad', 'box',
]

const exactMatch = computed(() => {
  if (!itemSearch.value) return true
  return itemOptions.value.some(
    (opt) => opt.name.toLowerCase() === itemSearch.value.toLowerCase(),
  )
})

const canAdd = computed(() => {
  if (!selectedLocatorId.value) return false
  if (quantity.value < 1) return false
  if (isCreatingNew.value) {
    return !!newItemName.value && !!newItemCategoryId.value
  }
  return !!selectedItem.value
})

// Load locators on mount
onMounted(async () => {
  await locatorsStore.fetchLocators({ limit: 100 })
  locatorOptions.value = locatorsStore.locators.map((l) => ({ id: l.id, name: l.name }))
  categories.value = await catalogApi.listCategories()
  await searchItems()
})

// Load sublocators when locator changes
watch(selectedLocatorId, async (id) => {
  selectedSublocatorId.value = null
  if (id) {
    await locatorsStore.fetchSublocators(id)
    sublocatorOptions.value = locatorsStore.sublocators.map((s) => ({ id: s.id, name: s.name }))
  } else {
    sublocatorOptions.value = []
  }
})

let searchTimeout: ReturnType<typeof setTimeout>

async function searchItems(query?: string) {
  itemsLoading.value = true
  try {
    const res = await catalogApi.listItems({ limit: 20, search: query || undefined })
    itemOptions.value = res.items.map((i) => ({ id: i.id, name: i.name }))
  } finally {
    itemsLoading.value = false
  }
}

function debouncedItemSearch(query: string) {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    searchItems(query)
  }, 300)
}

function selectNewItem() {
  isCreatingNew.value = true
  newItemName.value = itemSearch.value
  selectedItem.value = null
}

// When a real item is selected, cancel creating-new mode
watch(selectedItem, (val) => {
  if (val && val.id) {
    isCreatingNew.value = false
    newItemName.value = ''
  }
})

async function handleAdd() {
  if (!canAdd.value || adding.value) return
  adding.value = true

  try {
    const payload: Record<string, any> = {
      locator_id: selectedLocatorId.value!,
      sublocator_id: selectedSublocatorId.value,
      quantity: quantity.value,
    }

    if (isCreatingNew.value) {
      payload.item_name = newItemName.value
      payload.category_id = newItemCategoryId.value
      payload.unit_of_measure = newItemUnit.value
    } else {
      payload.item_id = selectedItem.value!.id
    }

    const result = await inventoryStore.quickAdd(payload as any)

    // Add to session list (newest first)
    sessionEntries.value.unshift({
      inventoryId: result.inventory.id,
      itemName: result.item.name,
      quantity: quantity.value,
      itemCreated: result.item_created,
      undoing: false,
    })

    notify.success(`Added ${quantity.value}x ${result.item.name}`)

    // Reset form but keep location
    selectedItem.value = null
    itemSearch.value = ''
    isCreatingNew.value = false
    newItemName.value = ''
    quantity.value = 1

    // Refocus the item input
    await nextTick()
    itemInputRef.value?.focus()
  } catch (e: any) {
    const msg = e?.response?.data?.detail || e?.message || 'Failed to add item'
    notify.error(msg)
  } finally {
    adding.value = false
  }
}

async function undoEntry(index: number) {
  const entry = sessionEntries.value[index]!
  if (entry.undoing) return
  entry.undoing = true

  try {
    // Adjust inventory down by the quantity that was added
    await inventoryStore.adjustStock(entry.inventoryId, {
      adjustment: -entry.quantity,
      reason: 'Undo quick-add entry',
    })
    sessionEntries.value.splice(index, 1)
    notify.success(`Undid ${entry.itemName}`)
  } catch (e: any) {
    const msg = e?.response?.data?.detail || e?.message || 'Failed to undo'
    notify.error(msg)
    entry.undoing = false
  }
}
</script>

<style scoped>
.stock-shelf-location {
  position: sticky;
  top: 64px;
  z-index: 1;
}
</style>
