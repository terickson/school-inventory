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
  </v-form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { VForm } from 'vuetify/components'
import type { Item } from '@/types'
import CategorySelect from './CategorySelect.vue'

const props = defineProps<{
  item?: Item | null
}>()

const formRef = ref<VForm>()

const form = reactive({
  name: '',
  description: '',
  category_id: null as number | null,
  unit_of_measure: 'unit',
})

const rules = {
  required: (v: string) => !!v || 'Required',
  requiredNum: (v: unknown) => v !== null || 'Required',
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

function reset() {
  form.name = ''
  form.description = ''
  form.category_id = null
  form.unit_of_measure = 'unit'
  formRef.value?.resetValidation()
}

defineExpose({ validate, getData, reset })
</script>
