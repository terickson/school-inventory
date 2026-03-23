<template>
  <v-form ref="formRef" @submit.prevent>
    <v-text-field
      v-model="form.name"
      label="Shelf Name"
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
import type { Sublocator } from '@/types'

const props = defineProps<{
  sublocator?: Sublocator | null
}>()

const formRef = ref<VForm>()

const form = reactive({
  name: '',
  description: '',
})

const rules = {
  required: (v: string) => !!v || 'Required',
}

watch(() => props.sublocator, (s) => {
  if (s) {
    form.name = s.name
    form.description = s.description ?? ''
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
