<template>
  <v-dialog v-model="dialogOpen" max-width="600" persistent>
    <v-card>
      <v-card-title>Import Inventory from CSV</v-card-title>
      <v-card-text>
        <!-- Import form -->
        <template v-if="!result">
          <v-select
            v-model="selectedLocatorId"
            :items="locatorOptions"
            item-title="name"
            item-value="id"
            label="Target Location"
            :rules="[(v: number | null) => v !== null || 'Required']"
            data-testid="import-locator-select"
          />
          <v-file-input
            v-model="selectedFile"
            label="CSV File"
            accept=".csv"
            prepend-icon="mdi-file-delimited"
            :rules="[(v: File[] | null) => (v && v.length > 0) || 'Required']"
            data-testid="import-file-input"
          />
          <v-alert type="info" density="compact" variant="tonal" class="mt-2">
            CSV should have columns: Item Name, Category, Shelf, Quantity, Min Quantity, Unit.
            Required: Item Name, Quantity. Existing items will have their quantity replaced.
          </v-alert>
        </template>

        <!-- Result summary -->
        <template v-else>
          <v-alert type="success" density="compact" class="mb-3" data-testid="import-result-summary">
            Processed {{ result.total_rows }} rows: {{ result.created }} created, {{ result.updated }} updated.
          </v-alert>
          <v-alert
            v-if="result.errors.length > 0"
            type="warning"
            density="compact"
            data-testid="import-result-errors"
          >
            <div class="font-weight-medium mb-1">{{ result.errors.length }} row(s) had errors:</div>
            <div v-for="err in result.errors" :key="err.row" class="text-body-2">
              Row {{ err.row }}: {{ err.item_name || '(empty)' }} — {{ err.error }}
            </div>
          </v-alert>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close" data-testid="import-cancel-btn">
          {{ result ? 'Close' : 'Cancel' }}
        </v-btn>
        <v-btn
          v-if="!result"
          color="primary"
          :loading="importing"
          :disabled="!canImport"
          data-testid="import-submit-btn"
          @click="handleImport"
        >
          Import
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { inventoryApi } from '@/api'
import { useLocatorsStore } from '@/stores/locators'
import { useNotify } from '@/composables'
import type { ImportResult } from '@/types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'imported': []
}>()

const locatorsStore = useLocatorsStore()
const notify = useNotify()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const locatorOptions = ref<{ id: number; name: string }[]>([])
const selectedLocatorId = ref<number | null>(null)
const selectedFile = ref<File[] | null>(null)
const importing = ref(false)
const result = ref<ImportResult | null>(null)

const canImport = computed(() => {
  return selectedLocatorId.value !== null && selectedFile.value && selectedFile.value.length > 0
})

watch(dialogOpen, async (open) => {
  if (open) {
    result.value = null
    selectedFile.value = null
    selectedLocatorId.value = null
    await locatorsStore.fetchLocators({ limit: 100 })
    locatorOptions.value = locatorsStore.locators.map((l) => ({ id: l.id, name: l.name }))
  }
})

async function handleImport() {
  if (!canImport.value) return
  importing.value = true
  try {
    const file = selectedFile.value![0] as File
    result.value = await inventoryApi.importCsv(
      selectedLocatorId.value!,
      file,
    )
    if (result.value.errors.length === 0) {
      notify.success(`Imported ${result.value.created} new, updated ${result.value.updated}`)
    } else {
      notify.warning(`Import completed with ${result.value.errors.length} error(s)`)
    }
    emit('imported')
  } catch (e: any) {
    const msg = e?.response?.data?.detail || e?.message || 'Import failed'
    notify.error(msg)
  } finally {
    importing.value = false
  }
}

function close() {
  dialogOpen.value = false
}
</script>
