<template>
  <div>
    <PageHeader title="My Profile" subtitle="View and update your account" />

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-subtitle-1">Account Information</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item>
                <v-list-item-title>Username</v-list-item-title>
                <v-list-item-subtitle>{{ authStore.user?.username }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Full Name</v-list-item-title>
                <v-list-item-subtitle>{{ authStore.user?.full_name }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Email</v-list-item-title>
                <v-list-item-subtitle>{{ authStore.user?.email }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Role</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip :color="authStore.user?.role === 'admin' ? 'primary' : 'secondary'" size="small" variant="tonal">
                    {{ authStore.user?.role }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-subtitle-1">Change Password</v-card-title>
          <v-card-text>
            <v-form ref="passwordFormRef" @submit.prevent="handleChangePassword">
              <v-text-field
                v-model="passwordForm.current_password"
                label="Current Password"
                type="password"
                :rules="[rules.required]"
              />
              <v-text-field
                v-model="passwordForm.new_password"
                label="New Password"
                type="password"
                :rules="[rules.required, rules.minLength]"
              />
              <v-text-field
                v-model="confirmPassword"
                label="Confirm New Password"
                type="password"
                :rules="[rules.required, rules.matchPassword]"
              />
              <v-btn type="submit" color="primary" :loading="saving">
                Change Password
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { VForm } from 'vuetify/components'
import { useAuthStore } from '@/stores/auth'
import { usersApi } from '@/api'
import { useNotify } from '@/composables'
import PageHeader from '@/components/common/PageHeader.vue'

const authStore = useAuthStore()
const notify = useNotify()

const passwordFormRef = ref<VForm>()
const saving = ref(false)
const confirmPassword = ref('')

const passwordForm = reactive({
  current_password: '',
  new_password: '',
})

const rules = {
  required: (v: string) => !!v || 'Required',
  minLength: (v: string) => v.length >= 6 || 'Min 6 characters',
  matchPassword: (v: string) => v === passwordForm.new_password || 'Passwords do not match',
}

async function handleChangePassword() {
  const { valid } = await passwordFormRef.value!.validate()
  if (!valid) return

  saving.value = true
  try {
    await usersApi.changePassword({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    })
    notify.success('Password changed successfully')
    passwordForm.current_password = ''
    passwordForm.new_password = ''
    confirmPassword.value = ''
    passwordFormRef.value?.resetValidation()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to change password')
  } finally {
    saving.value = false
  }
}
</script>
