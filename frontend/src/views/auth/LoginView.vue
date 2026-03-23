<template>
  <AuthLayout>
    <div class="text-center mb-6">
      <v-icon icon="mdi-school" size="48" color="primary" class="mb-2" />
      <h1 class="text-h5 font-weight-bold">School Inventory</h1>
      <p class="text-body-2 text-grey">Sign in to your account</p>
    </div>

    <v-form
      ref="formRef"
      data-testid="login-form"
      @submit.prevent="handleLogin"
    >
      <v-text-field
        v-model="username"
        label="Username"
        prepend-inner-icon="mdi-account"
        :rules="[rules.required]"
        data-testid="username-input"
        class="mb-2"
        autofocus
      />
      <v-text-field
        v-model="password"
        label="Password"
        :type="showPassword ? 'text' : 'password'"
        prepend-inner-icon="mdi-lock"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        :rules="[rules.required]"
        data-testid="password-input"
        class="mb-2"
        @click:append-inner="showPassword = !showPassword"
      />

      <v-alert
        v-if="authStore.error"
        type="error"
        variant="tonal"
        class="mb-4"
        density="compact"
      >
        {{ authStore.error }}
      </v-alert>

      <v-btn
        type="submit"
        color="primary"
        block
        size="large"
        :loading="authStore.loading"
        data-testid="login-button"
      >
        Sign In
      </v-btn>
    </v-form>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { VForm } from 'vuetify/components'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/layouts/AuthLayout.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref<VForm>()
const username = ref('')
const password = ref('')
const showPassword = ref(false)

const rules = {
  required: (v: string) => !!v || 'Required',
}

async function handleLogin() {
  const { valid } = await formRef.value!.validate()
  if (!valid) return

  try {
    await authStore.login(username.value, password.value)
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch {
    // error is set in store
  }
}
</script>
