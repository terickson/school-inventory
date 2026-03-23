<template>
  <v-form ref="formRef" @submit.prevent="submit">
    <v-select
      v-model="form.inventory_id"
      :items="inventoryItems"
      item-title="label"
      item-value="id"
      label="Inventory Item"
      :rules="[rules.required]"
    />
    <v-text-field
      v-model.number="form.quantity"
      label="Quantity"
      type="number"
      min="1"
      :rules="[rules.required, rules.positiveNumber]"
    />
    <v-text-field
      v-model="form.due_date"
      label="Due Date"
      type="date"
      :rules="[rules.required]"
    />
    <v-select
      v-if="isAdmin"
      v-model="form.user_id"
      :items="users"
      item-title="full_name"
      item-value="id"
      label="Borrower (optional, admin)"
      clearable
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
import { ref, reactive, onMounted, computed } from 'vue'
import type { VForm } from 'vuetify/components'
import type { InventoryRecord } from '@/types'
import type { User } from '@/types'
import { useInventoryStore } from '@/stores/inventory'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'

const inventoryStore = useInventoryStore()
const usersStore = useUsersStore()
const authStore = useAuthStore()

const formRef = ref<VForm>()
const isAdmin = computed(() => authStore.isAdmin)

const form = reactive({
  inventory_id: null as number | null,
  quantity: 1,
  due_date: getDefaultDueDate(),
  notes: '',
  user_id: null as number | null,
})

const inventoryItems = computed(() =>
  inventoryStore.records.map((r: InventoryRecord) => ({
    id: r.id,
    label: `${r.item?.name ?? 'Item'} @ ${r.locator?.name ?? 'Location'} (Qty: ${r.quantity})`,
  }))
)

const users = computed(() => usersStore.users as User[])

const rules = {
  required: (v: unknown) => !!v || v === 0 || 'Required',
  positiveNumber: (v: number) => v > 0 || 'Must be greater than 0',
}

function getDefaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]!
}

onMounted(async () => {
  if (inventoryStore.records.length === 0) {
    await inventoryStore.fetchRecords({ limit: 100 })
  }
  if (isAdmin.value && usersStore.users.length === 0) {
    await usersStore.fetchUsers({ limit: 100 })
  }
})

async function validate(): Promise<boolean> {
  const result = await formRef.value?.validate()
  return result?.valid ?? false
}

function getData() {
  return {
    inventory_id: form.inventory_id!,
    quantity: form.quantity,
    due_date: form.due_date,
    notes: form.notes || undefined,
    user_id: form.user_id || undefined,
  }
}

function reset() {
  form.inventory_id = null
  form.quantity = 1
  form.due_date = getDefaultDueDate()
  form.notes = ''
  form.user_id = null
  formRef.value?.resetValidation()
}

function submit() {
  // parent handles via save event
}

defineExpose({ validate, getData, reset })
</script>
