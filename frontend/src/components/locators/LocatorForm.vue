<template>
  <v-form ref="formRef" @submit.prevent>
    <v-text-field
      v-model="form.name"
      label="Location Name"
      :rules="[rules.required]"
    />
    <v-textarea
      v-model="form.description"
      label="Description (optional)"
      rows="3"
      auto-grow
    />
  </v-form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { VForm } from 'vuetify/components'
import type { Locator } from '@/types'

const props = defineProps<{
  locator?: Locator | null
}>()

const formRef = ref<VForm>()

const form = reactive({
  name: '',
  description: '',
})

const rules = {
  required: (v: string) => !!v || 'Required',
}

watch(() => props.locator, (l) => {
  if (l) {
    form.name = l.name
    form.description = l.description ?? ''
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
