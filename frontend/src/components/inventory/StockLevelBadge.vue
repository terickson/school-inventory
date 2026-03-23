<template>
  <v-chip :color="badgeColor" :prepend-icon="badgeIcon" size="small" variant="tonal">
    {{ quantity }} / {{ minQuantity }}
  </v-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  quantity: number
  minQuantity: number
}>()

const badgeColor = computed(() => {
  if (props.quantity <= 0) return 'error'
  if (props.quantity <= props.minQuantity) return 'warning'
  return 'success'
})

const badgeIcon = computed(() => {
  if (props.quantity <= 0) return 'mdi-alert-circle-outline'
  if (props.quantity <= props.minQuantity) return 'mdi-alert-outline'
  return 'mdi-check-circle-outline'
})
</script>
