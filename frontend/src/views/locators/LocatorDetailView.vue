<template>
  <div>
    <v-btn variant="text" :to="{ name: 'locators' }" class="mb-2">
      <v-icon start>mdi-arrow-left</v-icon>
      Back to Locations
    </v-btn>

    <v-skeleton-loader v-if="locatorsStore.loading && !locatorsStore.currentLocator" type="card" />

    <template v-else-if="locatorsStore.currentLocator">
      <PageHeader :title="locatorsStore.currentLocator.name" :subtitle="locatorsStore.currentLocator.description ?? undefined" />

      <!-- Sublocators -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <span>Shelves</span>
          <v-spacer />
          <v-btn size="small" color="primary" data-testid="add-sublocator-btn" @click="openCreateSub">
            <v-icon start>mdi-plus</v-icon>
            Add Shelf
          </v-btn>
        </v-card-title>

        <v-data-table-server
          data-testid="sublocators-table"
          :headers="subHeaders"
          :items="locatorsStore.sublocators"
          :items-length="locatorsStore.sublocators.length"
          :loading="locatorsStore.loading"
          :items-per-page="-1"
          hide-default-footer
        >
          <template #item.actions="{ item }">
            <v-btn icon size="small" variant="text" @click="openEditSub(item)">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn icon size="small" variant="text" color="error" @click="handleDeleteSub(item)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-data-table-server>

        <EmptyState
          v-if="locatorsStore.sublocators.length === 0 && !locatorsStore.loading"
          title="No shelves yet"
          subtitle="Add shelves to organize items within this location"
          action-text="Add Shelf"
          icon="mdi-bookshelf"
          @action="openCreateSub"
        />
      </v-card>
    </template>

    <FormDialog
      v-model="subDialogOpen"
      :title="editingSub ? 'Edit Shelf' : 'Add Shelf'"
      :loading="saving"
      @save="handleSaveSub"
      @cancel="closeSubDialog"
    >
      <SublocatorForm ref="subFormRef" :sublocator="editingSub" />
    </FormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLocatorsStore } from '@/stores/locators'
import { useConfirm, useNotify } from '@/composables'
import type { Sublocator } from '@/types'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FormDialog from '@/components/common/FormDialog.vue'
import SublocatorForm from '@/components/locators/SublocatorForm.vue'

const route = useRoute()
const locatorsStore = useLocatorsStore()
const { confirm } = useConfirm()
const notify = useNotify()

const locatorId = Number(route.params.id)
const subDialogOpen = ref(false)
const saving = ref(false)
const editingSub = ref<Sublocator | null>(null)
const subFormRef = ref<InstanceType<typeof SublocatorForm>>()

const subHeaders = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

onMounted(() => {
  locatorsStore.fetchLocator(locatorId)
})

function openCreateSub() {
  editingSub.value = null
  subDialogOpen.value = true
}

function openEditSub(sub: Sublocator) {
  editingSub.value = sub
  subDialogOpen.value = true
}

function closeSubDialog() {
  subDialogOpen.value = false
  editingSub.value = null
}

async function handleSaveSub() {
  if (!subFormRef.value) return
  const valid = await subFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const data = subFormRef.value.getData()
    if (editingSub.value) {
      await locatorsStore.updateSublocator(locatorId, editingSub.value.id, data)
      notify.success('Shelf updated')
    } else {
      await locatorsStore.createSublocator(locatorId, data)
      notify.success('Shelf created')
    }
    closeSubDialog()
    await locatorsStore.fetchLocator(locatorId)
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to save shelf')
  } finally {
    saving.value = false
  }
}

async function handleDeleteSub(sub: Sublocator) {
  const confirmed = await confirm({
    title: 'Delete Shelf',
    message: `Are you sure you want to delete "${sub.name}"?`,
  })
  if (!confirmed) return

  try {
    await locatorsStore.deleteSublocator(locatorId, sub.id)
    notify.success('Shelf deleted')
    await locatorsStore.fetchLocator(locatorId)
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to delete shelf')
  }
}
</script>
