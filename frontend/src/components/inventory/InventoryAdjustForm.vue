<template>
  <v-form ref="formRef" @submit.prevent>
    <v-text-field
      v-model.number="form.adjustment"
      label="Quantity Change (+ or -)"
      type="number"
      :rules="[rules.required, rules.nonZero]"
      hint="Use positive to add, negative to remove"
      persistent-hint
    />
    <v-textarea
      v-model="form.reason"
      label="Reason"
      :rules="[rules.required]"
      rows="2"
      auto-grow
    />
  </v-form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { VForm } from 'vuetify/components'

const formRef = ref<VForm>()

const form = reactive({
  adjustment: 0,
  reason: '',
})

const rules = {
  required: (v: unknown) => (v !== '' && v !== null && v !== undefined) || 'Required',
  nonZero: (v: number) => v !== 0 || 'Cannot be zero',
}

async function validate(): Promise<boolean> {
  const result = await formRef.value?.validate()
  return result?.valid ?? false
}

function getData() {
  return {
    adjustment: form.adjustment,
    reason: form.reason,
  }
}

function reset() {
  form.adjustment = 0
  form.reason = ''
  formRef.value?.resetValidation()
}

defineExpose({ validate, getData, reset })
</script>
