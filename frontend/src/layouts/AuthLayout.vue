<template>
  <v-app>
    <v-main class="d-flex align-center justify-center" style="min-height: 100vh; background: linear-gradient(135deg, #1565C0 0%, #0D47A1 100%);">
      <v-container fluid class="d-flex align-center justify-center">
        <v-card class="pa-8" max-width="450" width="100%">
          <slot />
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
</script>
