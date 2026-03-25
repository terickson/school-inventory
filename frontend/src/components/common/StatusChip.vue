<template>
  <v-chip :color="chipColor" :prepend-icon="chipIcon" size="small" variant="tonal">
    {{ label }}
  </v-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const chipColor = computed(() => {
  switch (props.status) {
    case 'active': return 'info'
    case 'returned': return 'success'
    default: return 'grey'
  }
})

const chipIcon = computed(() => {
  switch (props.status) {
    case 'active': return 'mdi-clock-outline'
    case 'returned': return 'mdi-keyboard-return'
    default: return 'mdi-help-circle-outline'
  }
})

const label = computed(() => {
  return props.status.charAt(0).toUpperCase() + props.status.slice(1)
})
</script>
