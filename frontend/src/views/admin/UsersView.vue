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
            <v-btn icon size="small" variant="text" @click="openEdit(item)">
              <v-icon>mdi-pencil</v-icon>
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
