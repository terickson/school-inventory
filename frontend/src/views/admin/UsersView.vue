<template>
  <div>
    <PageHeader title="Users" subtitle="Manage user accounts">
      <template #actions>
        <v-btn color="primary" data-testid="add-user-btn" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Add User
        </v-btn>
      </template>
    </PageHeader>

    <v-card>
      <v-data-table-server
        data-testid="users-table"
        :headers="headers"
        :items="usersStore.users"
        :items-length="usersStore.total"
        :loading="usersStore.loading"
        :items-per-page="itemsPerPage"
        :page="page"
        @update:page="page = $event"
        @update:items-per-page="itemsPerPage = $event"
        @update:options="loadItems"
      >
        <template #top>
          <div class="pa-4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search users..."
              hide-details
              density="compact"
              data-testid="search-input"
              :style="isMobile ? '' : 'max-width: 300px'"
              @update:model-value="debouncedSearch"
            />
          </div>
        </template>

        <template #item.role="{ item }">
          <v-chip :color="item.role === 'admin' ? 'primary' : 'secondary'" size="small" variant="tonal">
            {{ item.role }}
          </v-chip>
        </template>

        <template #item.is_active="{ item }">
          <v-chip :color="item.is_active ? 'success' : 'error'" size="small" variant="tonal">
            {{ item.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <template v-if="!isMobile">
            <v-btn icon size="small" variant="text" @click="openEdit(item)" data-testid="edit-user-btn">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn icon size="small" variant="text" @click="openResetPassword(item)" data-testid="reset-password-btn">
              <v-icon>mdi-lock-reset</v-icon>
            </v-btn>
            <v-btn icon size="small" variant="text" color="error" @click="handleDeactivate(item)">
              <v-icon>mdi-account-off</v-icon>
            </v-btn>
          </template>
          <v-menu v-else>
            <template #activator="{ props }">
              <v-btn icon size="small" variant="text" v-bind="props">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item prepend-icon="mdi-pencil" title="Edit" @click="openEdit(item)" />
              <v-list-item prepend-icon="mdi-lock-reset" title="Reset Password" @click="openResetPassword(item)" />
              <v-list-item prepend-icon="mdi-account-off" title="Deactivate" class="text-error" @click="handleDeactivate(item)" />
            </v-list>
          </v-menu>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- User Form Dialog -->
    <FormDialog
      v-model="dialogOpen"
      :title="editingUser ? 'Edit User' : 'Add User'"
      :loading="saving"
      @save="handleSave"
      @cancel="closeDialog"
    >
      <UserForm ref="userFormRef" :user="editingUser" />
    </FormDialog>

    <!-- Reset Password Dialog -->
    <FormDialog
      v-model="resetPasswordOpen"
      title="Reset Password"
      :loading="resettingPassword"
      @save="handleResetPassword"
      @cancel="closeResetPassword"
    >
      <v-alert type="info" variant="tonal" density="compact" class="mb-4">
        Set a new password for <strong>{{ resetPasswordUser?.full_name || resetPasswordUser?.username }}</strong>.
      </v-alert>
      <v-form ref="resetPasswordFormRef">
        <v-text-field
          v-model="newPassword"
          label="New Password"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          :rules="passwordRules"
          data-testid="new-password-input"
          @click:append-inner="showPassword = !showPassword"
        />
        <v-text-field
          v-model="confirmPassword"
          label="Confirm Password"
          :type="showPassword ? 'text' : 'password'"
          :rules="confirmPasswordRules"
          data-testid="confirm-password-input"
        />
      </v-form>
    </FormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUsersStore } from '@/stores/users'
import { useConfirm, useNotify, useBreakpoint } from '@/composables'
import type { User } from '@/types'
import PageHeader from '@/components/common/PageHeader.vue'
import FormDialog from '@/components/common/FormDialog.vue'
import UserForm from '@/components/users/UserForm.vue'

const usersStore = useUsersStore()
const { confirm } = useConfirm()
const notify = useNotify()
const { isMobile } = useBreakpoint()

const page = ref(1)
const itemsPerPage = ref(20)
const search = ref('')
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([])
const dialogOpen = ref(false)
const saving = ref(false)
const editingUser = ref<User | null>(null)
const userFormRef = ref<InstanceType<typeof UserForm>>()

const resetPasswordOpen = ref(false)
const resettingPassword = ref(false)
const resetPasswordUser = ref<User | null>(null)
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const resetPasswordFormRef = ref<InstanceType<typeof import('vuetify/components').VForm>>()

const passwordRules = [
  (v: string) => !!v || 'Password is required',
  (v: string) => v.length >= 8 || 'Password must be at least 8 characters',
]
const confirmPasswordRules = [
  (v: string) => !!v || 'Please confirm the password',
  (v: string) => v === newPassword.value || 'Passwords do not match',
]

let searchTimeout: ReturnType<typeof setTimeout>

const headers = computed(() => [
  { title: 'Username', key: 'username', sortable: true },
  { title: 'Full Name', key: 'full_name', sortable: true },
  ...(!isMobile.value ? [{ title: 'Email', key: 'email', sortable: true }] : []),
  { title: 'Role', key: 'role', sortable: false },
  { title: 'Status', key: 'is_active', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
])

function loadItems(options?: { sortBy?: { key: string; order: 'asc' | 'desc' }[] }) {
  if (options?.sortBy) sortBy.value = options.sortBy
  const sort = sortBy.value[0]
  usersStore.fetchUsers({
    skip: (page.value - 1) * itemsPerPage.value,
    limit: itemsPerPage.value,
    search: search.value || undefined,
    sort_by: sort?.key,
    sort_order: sort?.order,
  })
}

function debouncedSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    loadItems()
  }, 300)
}

function openCreate() {
  editingUser.value = null
  dialogOpen.value = true
}

function openEdit(user: User) {
  editingUser.value = user
  dialogOpen.value = true
}

function closeDialog() {
  dialogOpen.value = false
  editingUser.value = null
}

async function handleSave() {
  if (!userFormRef.value) return
  const valid = await userFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const data = userFormRef.value.getData()
    if (editingUser.value) {
      await usersStore.updateUser(editingUser.value.id, data)
      notify.success('User updated successfully')
    } else {
      await usersStore.createUser(data as Parameters<typeof usersStore.createUser>[0])
      notify.success('User created successfully')
    }
    closeDialog()
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to save user')
  } finally {
    saving.value = false
  }
}

function openResetPassword(user: User) {
  resetPasswordUser.value = user
  newPassword.value = ''
  confirmPassword.value = ''
  showPassword.value = false
  resetPasswordOpen.value = true
}

function closeResetPassword() {
  resetPasswordOpen.value = false
  resetPasswordUser.value = null
}

async function handleResetPassword() {
  if (!resetPasswordFormRef.value) return
  const { valid } = await resetPasswordFormRef.value.validate()
  if (!valid) return

  resettingPassword.value = true
  try {
    await usersStore.resetPassword(resetPasswordUser.value!.id, { new_password: newPassword.value })
    notify.success('Password reset successfully')
    closeResetPassword()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to reset password')
  } finally {
    resettingPassword.value = false
  }
}

async function handleDeactivate(user: User) {
  const confirmed = await confirm({
    title: 'Deactivate User',
    message: `Are you sure you want to deactivate ${user.full_name || user.username}? Their checkout history will be preserved.`,
  })
  if (!confirmed) return

  try {
    await usersStore.deactivateUser(user.id)
    notify.success('User deactivated')
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to deactivate user')
  }
}
</script>
