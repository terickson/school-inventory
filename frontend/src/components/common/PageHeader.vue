<template>
  <div class="d-flex align-center mb-4 flex-wrap ga-2">
    <div>
      <h1 class="text-h5 font-weight-medium">{{ title }}</h1>
      <p v-if="subtitle" class="text-body-2 text-grey mt-1">{{ subtitle }}</p>
    </div>
    <v-spacer />
    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>
