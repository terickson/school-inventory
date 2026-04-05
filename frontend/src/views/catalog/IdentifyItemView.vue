<template>
  <div>
    <PageHeader title="Identify Item" subtitle="Photograph unknown equipment for AI identification">
      <template #actions>
        <v-btn variant="text" :to="{ name: 'catalog' }" data-testid="back-to-catalog">
          <v-icon start>mdi-arrow-left</v-icon>
          Catalog
        </v-btn>
      </template>
    </PageHeader>

    <!-- Step 1: Image Capture -->
    <v-card v-if="!suggestion" class="mb-4" data-testid="capture-card">
      <v-card-title class="text-h6">Take or Upload a Photo</v-card-title>
      <v-card-text>
        <v-file-input
          v-model="imageFile"
          accept="image/jpeg,image/png,image/webp"
          :capture="isMobile ? 'environment' : undefined"
          prepend-icon="mdi-camera"
          label="Photo of equipment"
          show-size
          :rules="[fileRules.maxSize]"
          data-testid="identify-file-input"
          @update:model-value="onFileSelected"
        />

        <!-- Image preview -->
        <div v-if="previewUrl" class="d-flex justify-center my-4">
          <v-img
            :src="previewUrl"
            :max-width="isMobile ? 300 : 400"
            :max-height="300"
            contain
            rounded
            data-testid="identify-preview"
          />
        </div>

        <v-btn
          color="primary"
          size="large"
          block
          :disabled="!imageFile || identifying"
          :loading="identifying"
          data-testid="identify-btn"
          @click="identifyItem"
        >
          <v-icon start>mdi-magnify</v-icon>
          Identify
        </v-btn>

        <v-alert
          v-if="identifyError"
          type="error"
          variant="tonal"
          class="mt-4"
          closable
          data-testid="identify-error"
        >
          {{ identifyError }}
        </v-alert>
      </v-card-text>

      <v-overlay
        :model-value="identifying"
        contained
        class="align-center justify-center"
        persistent
      >
        <div class="text-center">
          <v-progress-circular indeterminate color="primary" size="48" />
          <div class="mt-2 text-body-1">Analyzing image...</div>
        </div>
      </v-overlay>
    </v-card>

    <!-- Step 2: Results & Edit -->
    <v-card v-if="suggestion" data-testid="suggestion-card">
      <v-card-title class="d-flex align-center ga-2">
        <span class="text-h6">Identification Result</span>
        <v-chip
          :color="confidenceColor"
          size="small"
          variant="tonal"
          data-testid="confidence-chip"
        >
          {{ suggestion.confidence }} confidence
        </v-chip>
      </v-card-title>

      <v-card-text>
        <!-- AI reasoning -->
        <v-alert type="info" variant="tonal" density="compact" class="mb-4" data-testid="reasoning-alert">
          {{ suggestion.reasoning }}
        </v-alert>

        <v-alert
          v-if="suggestion.confidence === 'low'"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          Low confidence identification. Please review carefully and edit as needed.
        </v-alert>

        <div :class="isMobile ? '' : 'd-flex ga-4'">
          <!-- Image thumbnail -->
          <div v-if="previewUrl" :class="isMobile ? 'mb-4 d-flex justify-center' : 'flex-shrink-0'">
            <v-img
              :src="previewUrl"
              :width="isMobile ? 200 : 160"
              :height="isMobile ? 200 : 160"
              cover
              rounded
            />
          </div>

          <!-- Editable form -->
          <v-form ref="formRef" class="flex-grow-1">
            <v-text-field
              v-model="editName"
              label="Item Name"
              :rules="[v => !!v || 'Name is required']"
              data-testid="identify-name"
            />
            <v-textarea
              v-model="editDescription"
              label="Description"
              rows="2"
              auto-grow
              data-testid="identify-description"
            />
            <CategorySelect
              v-model="editCategoryId"
              :rules="[v => !!v || 'Category is required']"
              data-testid="identify-category"
            />
            <v-select
              v-model="editUnit"
              :items="unitOptions"
              label="Unit of Measure"
              data-testid="identify-unit"
            />
          </v-form>
        </div>
      </v-card-text>

      <v-card-actions class="flex-wrap ga-2 pa-4">
        <v-btn
          variant="text"
          data-testid="try-again-btn"
          @click="resetToCapture"
        >
          <v-icon start>mdi-camera-retake</v-icon>
          Try Again
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="outlined"
          :loading="creating"
          data-testid="create-item-btn"
          @click="createItem(false)"
        >
          <v-icon start>mdi-plus</v-icon>
          Create Catalog Item
        </v-btn>
        <v-btn
          color="primary"
          :loading="creating"
          data-testid="create-and-stock-btn"
          @click="createItem(true)"
        >
          <v-icon start>mdi-plus-box</v-icon>
          Create &amp; Add to Inventory
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { VForm } from 'vuetify/components'
import PageHeader from '@/components/common/PageHeader.vue'
import CategorySelect from '@/components/catalog/CategorySelect.vue'
import { useBreakpoint } from '@/composables'
import { useNotify } from '@/composables'
import { catalogApi } from '@/api'

const router = useRouter()
const { isMobile } = useBreakpoint()
const { success, error: notifyError } = useNotify()

const unitOptions = ['unit', 'set', 'pair', 'pack', 'kit', 'roll', 'spool', 'bag', 'pad', 'box']

// Capture state
const imageFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const identifying = ref(false)
const identifyError = ref<string | null>(null)

// Result state
const suggestion = ref<{
  name: string
  description: string
  category_name: string
  category_id: number | null
  unit_of_measure: string
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
} | null>(null)

// Edit form state
const formRef = ref<InstanceType<typeof VForm> | null>(null)
const editName = ref('')
const editDescription = ref('')
const editCategoryId = ref<number | null>(null)
const editUnit = ref('unit')
const creating = ref(false)

const fileRules = {
  maxSize: (v: File | null) => !v || v.size <= 5 * 1024 * 1024 || 'Image must be 5 MB or less',
}

const confidenceColor = computed(() => {
  if (!suggestion.value) return 'grey'
  switch (suggestion.value.confidence) {
    case 'high': return 'success'
    case 'medium': return 'warning'
    case 'low': return 'error'
    default: return 'grey'
  }
})

function onFileSelected(file: File | File[] | null) {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
  const f = Array.isArray(file) ? file[0] : file
  if (f) {
    previewUrl.value = URL.createObjectURL(f)
    imageFile.value = f
  } else {
    imageFile.value = null
  }
  identifyError.value = null
}

async function identifyItem() {
  if (!imageFile.value) return

  identifying.value = true
  identifyError.value = null

  try {
    const result = await catalogApi.identifyItem(imageFile.value)
    suggestion.value = result
    editName.value = result.name
    editDescription.value = result.description
    editCategoryId.value = result.category_id
    editUnit.value = result.unit_of_measure
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'response' in e
      ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
      : undefined
    identifyError.value = msg || 'Failed to identify item. Please try again.'
  } finally {
    identifying.value = false
  }
}

async function createItem(goToStock: boolean) {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  creating.value = true
  try {
    const item = await catalogApi.createItem({
      name: editName.value,
      description: editDescription.value || undefined,
      category_id: editCategoryId.value!,
      unit_of_measure: editUnit.value,
    })

    // Upload the photo as the item image
    if (imageFile.value) {
      try {
        await catalogApi.uploadItemImage(item.id, imageFile.value)
      } catch {
        // Non-fatal: item created but image upload failed
      }
    }

    success(`"${item.name}" added to catalog`)

    if (goToStock) {
      router.push({ name: 'stock-shelf' })
    } else {
      resetToCapture()
    }
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'response' in e
      ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
      : undefined
    notifyError(msg || 'Failed to create item')
  } finally {
    creating.value = false
  }
}

function resetToCapture() {
  suggestion.value = null
  imageFile.value = null
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
  editName.value = ''
  editDescription.value = ''
  editCategoryId.value = null
  editUnit.value = 'unit'
  identifyError.value = null
}
</script>
