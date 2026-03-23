<template>
  <div>
    <PageHeader title="Checkouts" subtitle="Manage item checkouts and returns">
      <template #actions>
        <v-btn color="primary" data-testid="new-checkout-btn" @click="openCheckout">
          <v-icon start>mdi-plus</v-icon>
          New Checkout
        </v-btn>
      </template>
    </PageHeader>

    <v-card>
      <v-tabs v-model="tab" color="primary">
        <v-tab value="active">Active</v-tab>
        <v-tab value="overdue">Overdue</v-tab>
        <v-tab value="all">All</v-tab>
      </v-tabs>

      <v-data-table-server
        data-testid="checkouts-table"
        :headers="headers"
        :items="checkoutStore.checkouts"
        :items-length="checkoutStore.total"
        :loading="checkoutStore.loading"
        :items-per-page="itemsPerPage"
        :page="page"
        @update:page="page = $event"
        @update:items-per-page="itemsPerPage = $event"
        @update:options="loadItems"
      >
        <template #item.item="{ item }">
          {{ item.inventory?.item?.name ?? 'Unknown' }}
        </template>

        <template #item.borrower="{ item }">
          {{ item.user?.full_name ?? item.user?.username ?? 'Unknown' }}
        </template>

        <template #item.status="{ item }">
          <StatusChip :status="item.status" />
        </template>

        <template #item.due_date="{ item }">
          {{ formatDate(item.due_date) }}
        </template>

        <template #item.actions="{ item }">
          <v-btn
            v-if="item.status !== 'returned'"
            size="small"
            color="success"
            variant="tonal"
            class="mr-1"
            @click="openReturn(item)"
          >
            Return
          </v-btn>
          <v-btn
            v-if="item.status !== 'returned' && authStore.isAdmin"
            size="small"
            color="info"
            variant="tonal"
            @click="openExtend(item)"
          >
            Extend
          </v-btn>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- New Checkout Dialog -->
    <FormDialog
      v-model="checkoutDialogOpen"
      title="New Checkout"
      :loading="saving"
      @save="handleCheckout"
      @cancel="checkoutDialogOpen = false"
    >
      <CheckoutForm ref="checkoutFormRef" />
    </FormDialog>

    <!-- Return Dialog -->
    <FormDialog
      v-model="returnDialogOpen"
      title="Return Items"
      :loading="saving"
      @save="handleReturn"
      @cancel="returnDialogOpen = false"
    >
      <ReturnForm ref="returnFormRef" :max-quantity="returningCheckout?.quantity ?? 1" />
    </FormDialog>

    <!-- Extend Dialog -->
    <FormDialog
      v-model="extendDialogOpen"
      title="Extend Due Date"
      :loading="saving"
      @save="handleExtend"
      @cancel="extendDialogOpen = false"
    >
      <v-text-field
        v-model="extendDate"
        label="New Due Date"
        type="date"
        :rules="[(v: string) => !!v || 'Required']"
      />
    </FormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCheckoutStore } from '@/stores/checkout'
import { useNotify } from '@/composables'
import type { Checkout, CheckoutStatus } from '@/types'
import PageHeader from '@/components/common/PageHeader.vue'
import FormDialog from '@/components/common/FormDialog.vue'
import StatusChip from '@/components/common/StatusChip.vue'
import CheckoutForm from '@/components/checkout/CheckoutForm.vue'
import ReturnForm from '@/components/checkout/ReturnForm.vue'

const authStore = useAuthStore()
const checkoutStore = useCheckoutStore()
const notify = useNotify()

const tab = ref<string>('active')
const page = ref(1)
const itemsPerPage = ref(20)
const checkoutDialogOpen = ref(false)
const returnDialogOpen = ref(false)
const extendDialogOpen = ref(false)
const saving = ref(false)
const returningCheckout = ref<Checkout | null>(null)
const extendingCheckout = ref<Checkout | null>(null)
const extendDate = ref('')
const checkoutFormRef = ref<InstanceType<typeof CheckoutForm>>()
const returnFormRef = ref<InstanceType<typeof ReturnForm>>()

const headers = [
  { title: 'Item', key: 'item', sortable: false },
  { title: 'Borrower', key: 'borrower', sortable: false },
  { title: 'Qty', key: 'quantity', sortable: false },
  { title: 'Due Date', key: 'due_date', sortable: true },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

watch(tab, () => {
  page.value = 1
  loadItems()
})

function getStatusFilter(): CheckoutStatus | undefined {
  if (tab.value === 'active') return 'active'
  if (tab.value === 'overdue') return 'overdue'
  return undefined
}

function loadItems() {
  checkoutStore.fetchCheckouts({
    skip: (page.value - 1) * itemsPerPage.value,
    limit: itemsPerPage.value,
    status: getStatusFilter(),
  })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}

function openCheckout() {
  checkoutDialogOpen.value = true
}

function openReturn(checkout: Checkout) {
  returningCheckout.value = checkout
  returnDialogOpen.value = true
}

function openExtend(checkout: Checkout) {
  extendingCheckout.value = checkout
  extendDate.value = ''
  extendDialogOpen.value = true
}

async function handleCheckout() {
  if (!checkoutFormRef.value) return
  const valid = await checkoutFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const data = checkoutFormRef.value.getData()
    await checkoutStore.createCheckout(data)
    notify.success('Checkout created')
    checkoutDialogOpen.value = false
    checkoutFormRef.value.reset()
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to create checkout')
  } finally {
    saving.value = false
  }
}

async function handleReturn() {
  if (!returnFormRef.value || !returningCheckout.value) return
  const valid = await returnFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const data = returnFormRef.value.getData()
    await checkoutStore.returnCheckout(returningCheckout.value.id, data)
    notify.success('Items returned')
    returnDialogOpen.value = false
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to return items')
  } finally {
    saving.value = false
  }
}

async function handleExtend() {
  if (!extendingCheckout.value || !extendDate.value) return

  saving.value = true
  try {
    await checkoutStore.extendCheckout(extendingCheckout.value.id, {
      due_date: extendDate.value,
    })
    notify.success('Due date extended')
    extendDialogOpen.value = false
    loadItems()
  } catch (e) {
    notify.error(e instanceof Error ? e.message : 'Failed to extend due date')
  } finally {
    saving.value = false
  }
}
</script>
