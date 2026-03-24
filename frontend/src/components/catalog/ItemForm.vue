<template>
  <v-form ref="formRef" @submit.prevent>
    <v-text-field
      v-model="form.name"
      label="Item Name"
      :rules="[rules.required]"
    />
    <v-textarea
      v-model="form.description"
      label="Description (optional)"
      rows="2"
      auto-grow
    />
    <CategorySelect v-model="form.category_id" :rules="[(v: unknown) => v !== null || 'Required']" />
    <v-text-field
      v-model="form.unit_of_measure"
      label="Unit of Measure"
      :rules="[rules.required]"
      placeholder="e.g., unit, box, pack"
    />
    <v-divider class="my-3" />
    <div class="text-subtitle-2 mb-2">Item Image</div>
    <v-img
      v-if="currentImageUrl && !removeImageFlag"
      :src="currentImageUrl"
      max-height="150"
      max-width="200"
      class="mb-2 rounded"
    />
    <v-btn
      v-if="currentImageUrl && !removeImageFlag"
      size="small"
      variant="text"
      color="error"
      class="mb-2"
      @click="removeImageFlag = true"
    >
      Remove current image
    </v-btn>
    <v-file-input
      v-model="imageFiles"
      label="Upload image"
      accept="image/jpeg,image/png,image/webp"
      prepend-icon="mdi-camera"
      :rules="[fileSizeRule]"
      show-size
    />
  </v-form>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import type { VForm } from 'vuetify/components'
import type { Item } from '@/types'
import CategorySelect from './CategorySelect.vue'

const props = defineProps<{
  item?: Item | null
}>()

const formRef = ref<VForm>()
const imageFiles = ref<File | File[] | null>(null)
const removeImageFlag = ref(false)

const form = reactive({
  name: '',
  description: '',
  category_id: null as number | null,
  unit_of_measure: 'unit',
})

const currentImageUrl = computed(() => {
  if (removeImageFlag.value) return null
  return props.item?.image_url ?? null
})

const rules = {
  required: (v: string) => !!v || 'Required',
}

function fileSizeRule(files: File[] | null) {
  if (!files || files.length === 0) return true
  const file = files[0]
  if (file && file.size > 5 * 1024 * 1024) return 'Image must be less than 5 MB'
  return true
}

watch(() => props.item, (i) => {
  if (i) {
    form.name = i.name
    form.description = i.description ?? ''
    form.category_id = i.category_id
    form.unit_of_measure = i.unit_of_measure
  } else {
    form.name = ''
    form.description = ''
    form.category_id = null
    form.unit_of_measure = 'unit'
  }
  imageFiles.value = null
  removeImageFlag.value = false
}, { immediate: true })

async function validate(): Promise<boolean> {
  const result = await formRef.value?.validate()
  return result?.valid ?? false
}

function getData() {
  return {
    name: form.name,
    description: form.description || undefined,
    category_id: form.category_id!,
    unit_of_measure: form.unit_of_measure,
  }
}

function getImageFile(): File | null {
  const val = imageFiles.value
  if (val instanceof File) return val
  if (Array.isArray(val)) return val[0] ?? null
  return null
}

function shouldRemoveImage(): boolean {
  return removeImageFlag.value
}

function reset() {
  form.name = ''
  form.description = ''
  form.category_id = null
  form.unit_of_measure = 'unit'
  imageFiles.value = null
  removeImageFlag.value = false
  formRef.value?.resetValidation()
}

defineExpose({ validate, getData, getImageFile, shouldRemoveImage, reset })
</script>
