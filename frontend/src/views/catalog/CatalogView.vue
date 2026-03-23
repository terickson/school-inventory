<template>
  <div>
    <PageHeader title="Item Catalog" subtitle="Browse and manage items">
      <template #actions>
        <v-btn v-if="authStore.isAdmin" color="primary" data-testid="add-item-btn" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Add Item
        </v-btn>
      </template>
    </PageHeader>

    <v-card>
      <v-data-table-server
        data-testid="items-table"
        :headers="headers"
        :items="catalogStore.items"
        :items-length="catalogStore.total"
        :loading="catalogStore.loading"
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
              label="Search items..."
              hide-details
              density="compact"
              class="mx-4"
              style="max-width: 300px"
              @update:model-value="debouncedSearch"
            />
            <v-select
              v-model="categoryFilter"
              :items="categoryOptions"
              item-title="name"
              item-value="id"
              label="Category"
              hide-details
              density="compact"
              clearable
              class="mx-4"
              style="max-width: 200px"
              @update:model-value="loadItems"
            />
          </v-toolbar>
        </template>

        <template #item.category="{ item }">
          <v-chip v-if="item.category" size="small" variant="tonal" color="secondary">
            {{ item.category.name }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <template v-if="authStore.isAdmin">
            <v-btn icon size="small" variant="text" @click="openEdit(item)">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn icon size="small" variant="text" color="error" @click="handleDelete(item)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
        </template>
      </v-data-table-server>
    </v-card>

    <FormDialog
      v-model="dialogOpen"
      :title="editingItem ? 'Edit Item' : 'Add Item'"
      :loading="saving"
      @save="handleSave"
      @cancel="closeDialog"
    >
      <ItemForm ref="itemFormRef" :item="editingItem" />
    </FormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useConfirm, useNotify } from '@/composables'
import type { Item } from '@/types'
import PageHeader from '@/components/common/PageHeader.vue'
import FormDialog from '@/components/common/FormDialog.vue'
import ItemForm from '@/components/catalog/ItemForm.vue'

const authStore = useAuthStore()
const catalogStore = useCatalogStore()
const { confirm } = useConfirm()
const notify = useNotify()

const page = ref(1)
const itemsPerPage = ref(20)
const search = ref('')
const categoryFilter = ref<number | null>(null)
const dialogOpen = ref(false)
const saving = ref(false)
const editingItem = ref<Item | null>(null)
const itemFormRef = ref<InstanceType<typeof ItemForm>>()
const categoryOptions = ref<{ id: number; name: string }[]>([])

let searchTimeout: ReturnType<typeof setTimeout>

const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Category', key: 'category', sortable: false },
  { title: 'Unit', key: 'unit_of_measure', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

onMounted(async () => {
  await catalogStore.fetchCategories()
  categoryOptions.value = catalogStore.categories.map((c) => ({ id: c.id, name: c.name }))
})

function loadItems() {
  catalogStore.fetchItems({
    skip: (page.value - 1) * itemsPerPage.value,
    limit: itemsPerPage.value,
    search: search.value || undefined,
    category_id: categoryFilter.value ?? undefined,
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
  editingItem.value = null
  dialogOpen.value = true
}

function openEdit(item: Item) {
  editingItem.value = item
  dialogOpen.value = true
}

function closeDialog() {
  dialogOpen.value = false
  editingItem.value = null
}

async function handleSave() {
  if (!itemFormRef.value) return
  const valid = await itemFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const data = itemFormRef.value.getData()
    if (editingItem.value) {
      await catalogStore.updateItem(editingItem.value.id, data)
      notify.success('Item updated')
    } else {
      await catalogStore.createItem(data)
      notify.success('Item created')
    }
    closeDialog()
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to save item')
  } finally {
    saving.value = false
  }
}

async function handleDelete(item: Item) {
  const confirmed = await confirm({
    title: 'Delete Item',
    message: `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
  })
  if (!confirmed) return

  try {
    await catalogStore.deleteItem(item.id)
    notify.success('Item deleted')
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to delete item')
  }
}
</script>
