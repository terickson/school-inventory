<template>
  <v-banner
    v-if="count > 0"
    color="error"
    icon="mdi-alert-circle"
    lines="one"
    class="mb-4"
  >
    <v-banner-text>
      You have {{ count }} overdue checkout{{ count > 1 ? 's' : '' }}. Please return items promptly.
    </v-banner-text>
    <template #actions>
      <v-btn variant="text" :to="{ name: 'overdue' }">View Overdue</v-btn>
    </template>
  </v-banner>
</template>

<script setup lang="ts">
defineProps<{
  count: number
}>()
</script>
