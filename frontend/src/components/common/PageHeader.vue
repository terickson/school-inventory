<template>
  <div class="d-flex align-center mb-4 flex-wrap ga-2">
    <div>
      <h1 :class="isMobile ? 'text-h6' : 'text-h5'" class="font-weight-medium">{{ title }}</h1>
      <p v-if="subtitle" class="text-body-2 text-grey mt-1">{{ subtitle }}</p>
    </div>
    <v-spacer />
    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
import { useBreakpoint } from '@/composables'

defineProps<{
  title: string
  subtitle?: string
}>()

const { isMobile } = useBreakpoint()
</script>
