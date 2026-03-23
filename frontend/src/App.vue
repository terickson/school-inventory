<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { defineComponent, h } from 'vue'

const route = useRoute()

// For login (auth layout), the view itself includes its layout
// For all other routes, wrap with AppLayout
const PassThrough = defineComponent({
  setup(_, { slots }) {
    return () => slots.default ? slots.default() : null
  },
})

const layout = computed(() => {
  if (route.meta.layout === 'auth') {
    return PassThrough
  }
  return AppLayout
})
</script>
