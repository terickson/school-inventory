<template>
  <v-dialog v-model="isOpen" max-width="450" persistent>
    <v-card>
      <v-card-title class="text-h6">{{ options.title }}</v-card-title>
      <v-card-text>{{ options.message }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          data-testid="confirm-dialog-cancel"
          @click="handleCancel"
        >
          {{ options.cancelText }}
        </v-btn>
        <v-btn
          :color="options.confirmColor"
          variant="elevated"
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
import { useConfirm } from '@/composables'

const { isOpen, options, handleConfirm, handleCancel } = useConfirm()
</script>
