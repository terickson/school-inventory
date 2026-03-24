<template>
  <v-form ref="formRef" @submit.prevent>
    <v-text-field
      v-model="form.name"
      label="Category Name"
      :rules="[rules.required]"
    />
    <v-textarea
      v-model="form.description"
      label="Description (optional)"
      rows="2"
      auto-grow
    />
  </v-form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { VForm } from 'vuetify/components'
import type { Category } from '@/types'

const props = defineProps<{
  category?: Category | null
}>()

const formRef = ref<VForm>()

const form = reactive({
  name: '',
  description: '',
})

const rules = {
  required: (v: string) => !!v || 'Required',
}

watch(() => props.category, (c) => {
  if (c) {
    form.name = c.name
    form.description = c.description ?? ''
  } else {
    form.name = ''
    form.description = ''
  }
}, { immediate: true })

async function validate(): Promise<boolean> {
  const result = await formRef.value?.validate()
  return result?.valid ?? false
}

function getData() {
  return {
    name: form.name,
    description: form.description || undefined,
  }
}

function reset() {
  form.name = ''
  form.description = ''
  formRef.value?.resetValidation()
}

defineExpose({ validate, getData, reset })
</script>
