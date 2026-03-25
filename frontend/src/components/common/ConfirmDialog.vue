<template>
  <v-dialog v-model="isOpen" :max-width="isMobile ? undefined : 450" :fullscreen="isMobile" persistent>
    <v-card>
      <v-toolbar v-if="isMobile" color="surface" density="compact" flat>
        <v-btn icon @click="handleCancel" data-testid="confirm-dialog-cancel">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ options.title }}</v-toolbar-title>
      </v-toolbar>
      <v-card-title v-if="!isMobile" class="text-h6">{{ options.title }}</v-card-title>
      <v-card-text>{{ options.message }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          v-if="!isMobile"
          variant="text"
          data-testid="confirm-dialog-cancel"
          @click="handleCancel"
        >
          {{ options.cancelText }}
        </v-btn>
        <v-btn
          :color="options.confirmColor"
          variant="elevated"
          :block="isMobile"
          data-testid="confirm-dialog-confirm"
          @click="handleConfirm"
        >
          {{ options.confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useConfirm, useBreakpoint } from '@/composables'

const { isOpen, options, handleConfirm, handleCancel } = useConfirm()
const { isMobile } = useBreakpoint()
</script>
