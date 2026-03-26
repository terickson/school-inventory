<template>
  <v-form ref="formRef" @submit.prevent>
    <v-text-field
      v-model="form.username"
      label="Username"
      :rules="[rules.required]"
      :disabled="isEdit"
    />
    <v-text-field
      v-model="form.full_name"
      label="Full Name"
      :rules="[rules.required]"
    />
    <v-select
      v-model="form.role"
      :items="['admin', 'teacher']"
      label="Role"
      :rules="[rules.required]"
    />
    <v-text-field
      v-if="!isEdit"
      v-model="form.password"
      label="Password"
      type="password"
      :rules="[rules.required, rules.minLength]"
    />
  </v-form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { VForm } from 'vuetify/components'
import type { User, UserRole } from '@/types'

const props = defineProps<{
  user?: User | null
}>()

const formRef = ref<VForm>()
const isEdit = ref(!!props.user)

const form = reactive({
  username: '',
  full_name: '',
  role: 'teacher' as UserRole,
  password: '',
})

const rules = {
  required: (v: string) => !!v || 'Required',
  minLength: (v: string) => v.length >= 6 || 'Min 6 characters',
}

watch(() => props.user, (u) => {
  if (u) {
    isEdit.value = true
    form.username = u.username
    form.full_name = u.full_name
    form.role = u.role
  } else {
    isEdit.value = false
    form.username = ''
    form.full_name = ''
    form.role = 'teacher'
    form.password = ''
  }
}, { immediate: true })

async function validate(): Promise<boolean> {
  const result = await formRef.value?.validate()
  return result?.valid ?? false
}

function getData() {
  if (isEdit.value) {
    return { full_name: form.full_name, role: form.role }
  }
  return {
    username: form.username,
    full_name: form.full_name,
    role: form.role,
    password: form.password,
  }
}

function reset() {
  form.username = ''
  form.full_name = ''
  form.role = 'teacher'
  form.password = ''
  formRef.value?.resetValidation()
}

defineExpose({ validate, getData, reset })
</script>
