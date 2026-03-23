<template>
  <v-dialog
    v-model="dialogModel"
    :max-width="isMobile ? undefined : maxWidth"
    :fullscreen="isMobile"
    persistent
    scrollable
  >
    <v-card>
      <v-toolbar v-if="isMobile" color="primary" density="compact">
        <v-btn icon @click="cancel" data-testid="form-dialog-cancel">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ title }}</v-toolbar-title>
        <v-spacer />
        <v-btn
          variant="text"
          :loading="loading"
          :disabled="loading"
          data-testid="form-dialog-save"
          @click="save"
        >
          Save
        </v-btn>
      </v-toolbar>
      <v-card-title v-if="!isMobile" class="text-h6 pt-4">{{ title }}</v-card-title>
      <v-card-text>
        <slot />
      </v-card-text>
      <v-card-actions v-if="!isMobile">
        <v-spacer />
        <v-btn variant="text" data-testid="form-dialog-cancel" @click="cancel">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="loading"
          :disabled="loading"
          data-testid="form-dialog-save"
          @click="save"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBreakpoint } from '@/composables'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  loading?: boolean
  maxWidth?: number
}>(), {
  loading: false,
  maxWidth: 600,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: []
  cancel: []
}>()

const { isMobile } = useBreakpoint()

const dialogModel = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

function save() {
  emit('save')
}

function cancel() {
  emit('update:modelValue', false)
  emit('cancel')
}
</script>
