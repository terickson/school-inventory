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
              @update:model-value="() => loadItems()"
            />
          </v-toolbar>
        </template>

        <template #item.image="{ item }">
          <v-avatar
            size="40"
            rounded="sm"
            color="grey-lighten-3"
            :style="item.image_url ? 'cursor: pointer' : ''"
            :data-testid="item.image_url ? 'image-preview-trigger' : undefined"
            @click="item.image_url && openImagePreview(item)"
          >
            <v-img v-if="item.image_url" :src="item.image_url" cover />
            <v-icon v-else size="24" color="grey">mdi-package-variant-closed</v-icon>
          </v-avatar>
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

    <v-dialog v-model="previewOpen" max-width="800" data-testid="image-preview-dialog">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>{{ previewItemName }}</span>
          <v-spacer />
          <v-btn icon variant="text" @click="previewOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="d-flex justify-center pa-4">
          <v-img :src="previewImageUrl!" max-height="70vh" max-width="100%" contain />
        </v-card-text>
      </v-card>
    </v-dialog>

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
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([])
const categoryFilter = ref<number | null>(null)
const dialogOpen = ref(false)
const saving = ref(false)
const editingItem = ref<Item | null>(null)
const itemFormRef = ref<InstanceType<typeof ItemForm>>()
const categoryOptions = ref<{ id: number; name: string }[]>([])
const previewOpen = ref(false)
const previewImageUrl = ref<string | null>(null)
const previewItemName = ref('')

let searchTimeout: ReturnType<typeof setTimeout>

const headers = [
  { title: '', key: 'image', sortable: false, width: '60px' },
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

function loadItems(options?: { sortBy?: { key: string; order: 'asc' | 'desc' }[] }) {
  if (options?.sortBy) sortBy.value = options.sortBy
  const sort = sortBy.value[0]
  catalogStore.fetchItems({
    skip: (page.value - 1) * itemsPerPage.value,
    limit: itemsPerPage.value,
    search: search.value || undefined,
    category_id: categoryFilter.value ?? undefined,
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

function openImagePreview(item: Item) {
  previewImageUrl.value = item.image_url
  previewItemName.value = item.name
  previewOpen.value = true
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
    const isEdit = !!editingItem.value
    let savedItem: Item
    if (isEdit) {
      savedItem = await catalogStore.updateItem(editingItem.value!.id, data)
    } else {
      savedItem = await catalogStore.createItem(data)
    }

    // Handle image upload/removal — roll back item creation if image fails
    const imageFile = itemFormRef.value.getImageFile()
    try {
      if (imageFile) {
        await catalogStore.uploadItemImage(savedItem.id, imageFile)
      } else if (itemFormRef.value.shouldRemoveImage()) {
        await catalogStore.deleteItemImage(savedItem.id)
      }
    } catch (imageError) {
      if (!isEdit) {
        // Roll back: delete the item we just created so it doesn't linger without an image
        try {
          await catalogStore.deleteItem(savedItem.id)
        } catch {
          // Best effort cleanup
        }
      }
      throw imageError
    }

    notify.success(isEdit ? 'Item updated' : 'Item created')
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
