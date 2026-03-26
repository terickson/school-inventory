<template>
  <div>
    <PageHeader title="Categories" subtitle="Manage item categories">
      <template #actions>
        <v-btn color="primary" data-testid="add-category-btn" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Add Category
        </v-btn>
      </template>
    </PageHeader>

    <v-card>
      <v-data-table-server
        data-testid="categories-table"
        :headers="headers"
        :items="catalogStore.managedCategories"
        :items-length="catalogStore.categoriesTotal"
        :loading="catalogStore.categoriesLoading"
        :items-per-page="itemsPerPage"
        :page="page"
        @update:page="page = $event"
        @update:items-per-page="itemsPerPage = $event"
        @update:options="loadItems"
      >
        <template #top>
          <div class="pa-4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search categories..."
              hide-details
              density="compact"
              data-testid="search-input"
              :style="isMobile ? '' : 'max-width: 300px'"
              @update:model-value="debouncedSearch"
            />
          </div>
        </template>

        <template #item.actions="{ item }">
          <template v-if="!isMobile">
            <v-btn icon size="small" variant="text" @click="openEdit(item)">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn icon size="small" variant="text" color="error" @click="handleDelete(item)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
          <v-menu v-else>
            <template #activator="{ props }">
              <v-btn icon size="small" variant="text" v-bind="props">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item prepend-icon="mdi-pencil" title="Edit" @click="openEdit(item)" />
              <v-list-item prepend-icon="mdi-delete" title="Delete" class="text-error" @click="handleDelete(item)" />
            </v-list>
          </v-menu>
        </template>
      </v-data-table-server>
    </v-card>

    <FormDialog
      v-model="dialogOpen"
      :title="editingCategory ? 'Edit Category' : 'Add Category'"
      :loading="saving"
      @save="handleSave"
      @cancel="closeDialog"
    >
      <CategoryForm ref="categoryFormRef" :category="editingCategory" />
    </FormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import { useConfirm, useNotify, useBreakpoint } from '@/composables'
import type { Category } from '@/types'
import PageHeader from '@/components/common/PageHeader.vue'
import FormDialog from '@/components/common/FormDialog.vue'
import CategoryForm from '@/components/catalog/CategoryForm.vue'

const catalogStore = useCatalogStore()
const { confirm } = useConfirm()
const notify = useNotify()
const { isMobile } = useBreakpoint()

const page = ref(1)
const itemsPerPage = ref(20)
const search = ref('')
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([])
const dialogOpen = ref(false)
const saving = ref(false)
const editingCategory = ref<Category | null>(null)
const categoryFormRef = ref<InstanceType<typeof CategoryForm>>()

let searchTimeout: ReturnType<typeof setTimeout>

const headers = computed(() => [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  ...(!isMobile.value ? [{ title: 'Created', key: 'created_at', sortable: true }] : []),
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
])

function loadItems(options?: { sortBy?: { key: string; order: 'asc' | 'desc' }[] }) {
  if (options?.sortBy) sortBy.value = options.sortBy
  const sort = sortBy.value[0]
  catalogStore.fetchCategoriesPaginated({
    skip: (page.value - 1) * itemsPerPage.value,
    limit: itemsPerPage.value,
    search: search.value || undefined,
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
  editingCategory.value = null
  dialogOpen.value = true
}

function openEdit(category: Category) {
  editingCategory.value = category
  dialogOpen.value = true
}

function closeDialog() {
  dialogOpen.value = false
  editingCategory.value = null
}

async function handleSave() {
  if (!categoryFormRef.value) return
  const valid = await categoryFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const data = categoryFormRef.value.getData()
    if (editingCategory.value) {
      await catalogStore.updateCategory(editingCategory.value.id, data)
      notify.success('Category updated successfully')
    } else {
      await catalogStore.createCategory(data)
      notify.success('Category created successfully')
    }
    closeDialog()
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to save category')
  } finally {
    saving.value = false
  }
}

async function handleDelete(category: Category) {
  const confirmed = await confirm({
    title: 'Delete Category',
    message: `Are you sure you want to delete "${category.name}"? This cannot be undone.`,
  })
  if (!confirmed) return

  try {
    await catalogStore.deleteCategory(category.id)
    notify.success('Category deleted')
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to delete category')
  }
}
</script>
