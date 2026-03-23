<template>
  <v-form ref="formRef" @submit.prevent>
    <v-text-field
      v-model.number="form.quantity"
      label="Return Quantity"
      type="number"
      min="1"
      :max="maxQuantity"
      :rules="[rules.required, rules.positiveNumber, rules.maxQuantity]"
    />
    <v-textarea
      v-model="form.notes"
      label="Notes (optional)"
      rows="2"
      auto-grow
    />
  </v-form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { VForm } from 'vuetify/components'

const props = defineProps<{
  maxQuantity: number
}>()

const formRef = ref<VForm>()

const form = reactive({
  quantity: props.maxQuantity,
  notes: '',
})

const rules = {
  required: (v: unknown) => !!v || v === 0 || 'Required',
  positiveNumber: (v: number) => v > 0 || 'Must be greater than 0',
  maxQuantity: (v: number) => v <= props.maxQuantity || `Cannot return more than ${props.maxQuantity}`,
}

async function validate(): Promise<boolean> {
  const result = await formRef.value?.validate()
  return result?.valid ?? false
}

function getData() {
  return {
    quantity: form.quantity,
    notes: form.notes || undefined,
  }
}

function reset() {
  form.quantity = props.maxQuantity
  form.notes = ''
  formRef.value?.resetValidation()
}

defineExpose({ validate, getData, reset })
</script>
