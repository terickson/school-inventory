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

        <template #item.returned="{ item }">
          {{ item.returned_quantity }} / {{ item.quantity }}
        </template>

        <template #item.status="{ item }">
          <StatusChip :status="item.status" />
        </template>

        <template #item.actions="{ item }">
          <v-btn
            v-if="item.status !== 'returned'"
            :size="isMobile ? 'default' : 'small'"
            color="success"
            variant="tonal"
            class="mr-1"
            @click="openReturn(item)"
          >
            Return
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
      <ReturnForm ref="returnFormRef" :max-quantity="(returningCheckout?.quantity ?? 1) - (returningCheckout?.returned_quantity ?? 0)" />
    </FormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCheckoutStore } from '@/stores/checkout'
import { useNotify, useBreakpoint } from '@/composables'
import type { Checkout, CheckoutStatus } from '@/types'
import PageHeader from '@/components/common/PageHeader.vue'
import FormDialog from '@/components/common/FormDialog.vue'
import StatusChip from '@/components/common/StatusChip.vue'
import CheckoutForm from '@/components/checkout/CheckoutForm.vue'
import ReturnForm from '@/components/checkout/ReturnForm.vue'

const checkoutStore = useCheckoutStore()
const notify = useNotify()
const { isMobile } = useBreakpoint()

const tab = ref<string>('active')
const page = ref(1)
const itemsPerPage = ref(20)
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([])
const checkoutDialogOpen = ref(false)
const returnDialogOpen = ref(false)
const saving = ref(false)
const returningCheckout = ref<Checkout | null>(null)
const checkoutFormRef = ref<InstanceType<typeof CheckoutForm>>()
const returnFormRef = ref<InstanceType<typeof ReturnForm>>()

const headers = computed(() => [
  { title: 'Item', key: 'item', sortable: false },
  { title: 'Borrower', key: 'borrower', sortable: false },
  ...(!isMobile.value ? [{ title: 'Qty', key: 'quantity', sortable: false }] : []),
  { title: 'Returned', key: 'returned', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
])

watch(tab, () => {
  page.value = 1
  loadItems()
})

function getStatusFilter(): CheckoutStatus | undefined {
  if (tab.value === 'active') return 'active'
  return undefined
}

function loadItems(options?: { sortBy?: { key: string; order: 'asc' | 'desc' }[] }) {
  if (options?.sortBy) sortBy.value = options.sortBy
  const sort = sortBy.value[0]
  checkoutStore.fetchCheckouts({
    skip: (page.value - 1) * itemsPerPage.value,
    limit: itemsPerPage.value,
    status: getStatusFilter(),
    sort_by: sort?.key,
    sort_order: sort?.order,
  })
}

function openCheckout() {
  checkoutDialogOpen.value = true
}

function openReturn(checkout: Checkout) {
  returningCheckout.value = checkout
  returnDialogOpen.value = true
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
</script>
