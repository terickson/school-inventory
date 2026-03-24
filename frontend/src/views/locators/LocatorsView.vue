<template>
  <div>
    <PageHeader title="Storage Locations" subtitle="Manage your storage closets and rooms">
      <template #actions>
        <v-btn color="primary" data-testid="add-locator-btn" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Add Location
        </v-btn>
      </template>
    </PageHeader>

    <v-card>
      <v-data-table-server
        data-testid="locators-table"
        :headers="headers"
        :items="locatorsStore.locators"
        :items-length="locatorsStore.total"
        :loading="locatorsStore.loading"
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
              label="Search locations..."
              hide-details
              density="compact"
              class="mx-4"
              style="max-width: 300px"
              @update:model-value="debouncedSearch"
            />
          </v-toolbar>
        </template>

        <template #item.name="{ item }">
          <router-link :to="{ name: 'locator-detail', params: { id: item.id } }" class="text-decoration-none text-primary font-weight-medium">
            {{ item.name }}
          </router-link>
        </template>

        <template #item.actions="{ item }">
          <v-btn icon size="small" variant="text" :to="{ name: 'locator-detail', params: { id: item.id } }">
            <v-icon>mdi-eye</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" @click="openEdit(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" color="error" @click="handleDelete(item)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-data-table-server>
    </v-card>

    <FormDialog
      v-model="dialogOpen"
      :title="editingLocator ? 'Edit Location' : 'Add Location'"
      :loading="saving"
      @save="handleSave"
      @cancel="closeDialog"
    >
      <LocatorForm ref="locatorFormRef" :locator="editingLocator" />
    </FormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLocatorsStore } from '@/stores/locators'
import { useConfirm, useNotify } from '@/composables'
import type { Locator } from '@/types'
import PageHeader from '@/components/common/PageHeader.vue'
import FormDialog from '@/components/common/FormDialog.vue'
import LocatorForm from '@/components/locators/LocatorForm.vue'

const locatorsStore = useLocatorsStore()
const { confirm } = useConfirm()
const notify = useNotify()

const page = ref(1)
const itemsPerPage = ref(20)
const search = ref('')
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([])
const dialogOpen = ref(false)
const saving = ref(false)
const editingLocator = ref<Locator | null>(null)
const locatorFormRef = ref<InstanceType<typeof LocatorForm>>()

let searchTimeout: ReturnType<typeof setTimeout>

const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Created', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

function loadItems(options?: { sortBy?: { key: string; order: 'asc' | 'desc' }[] }) {
  if (options?.sortBy) sortBy.value = options.sortBy
  const sort = sortBy.value[0]
  locatorsStore.fetchLocators({
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
  editingLocator.value = null
  dialogOpen.value = true
}

function openEdit(locator: Locator) {
  editingLocator.value = locator
  dialogOpen.value = true
}

function closeDialog() {
  dialogOpen.value = false
  editingLocator.value = null
}

async function handleSave() {
  if (!locatorFormRef.value) return
  const valid = await locatorFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const data = locatorFormRef.value.getData()
    if (editingLocator.value) {
      await locatorsStore.updateLocator(editingLocator.value.id, data)
      notify.success('Location updated successfully')
    } else {
      await locatorsStore.createLocator(data)
      notify.success('Location created successfully')
    }
    closeDialog()
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to save location')
  } finally {
    saving.value = false
  }
}

async function handleDelete(locator: Locator) {
  const confirmed = await confirm({
    title: 'Delete Location',
    message: `Are you sure you want to delete "${locator.name}"? This cannot be undone.`,
  })
  if (!confirmed) return

  try {
    await locatorsStore.deleteLocator(locator.id)
    notify.success('Location deleted')
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to delete location')
  }
}
</script>
