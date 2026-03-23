<template>
  <v-container class="text-center pa-8">
    <v-icon :icon="icon" size="64" color="grey-lighten-1" class="mb-4" />
    <div class="text-h6 text-grey-darken-1 mb-2">{{ title }}</div>
    <div v-if="subtitle" class="text-body-2 text-grey mb-4">{{ subtitle }}</div>
    <v-btn
      v-if="actionText"
      color="primary"
      @click="$emit('action')"
    >
      <v-icon start>{{ actionIcon }}</v-icon>
      {{ actionText }}
    </v-btn>
  </v-container>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  title: string
  subtitle?: string
  actionText?: string
  actionIcon?: string
}>(), {
  icon: 'mdi-inbox-outline',
  actionIcon: 'mdi-plus',
})

defineEmits<{
  action: []
}>()
</script>
