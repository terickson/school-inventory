<template>
  <v-select
    :model-value="modelValue"
    :items="categories"
    item-title="name"
    item-value="id"
    label="Category"
    :rules="rules"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import { storeToRefs } from 'pinia'

defineProps<{
  modelValue: number | null
  rules?: ((v: unknown) => boolean | string)[]
}>()

defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const catalogStore = useCatalogStore()
const { categories } = storeToRefs(catalogStore)

onMounted(async () => {
  if (categories.value.length === 0) {
    await catalogStore.fetchCategories()
  }
})
</script>
