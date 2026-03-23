<template>
  <div>
    <PageHeader title="Overdue Checkouts" subtitle="Items past their due date">
      <template #actions>
        <v-btn variant="text" :to="{ name: 'checkouts' }">
          <v-icon start>mdi-arrow-left</v-icon>
          All Checkouts
        </v-btn>
      </template>
    </PageHeader>

    <v-card>
      <v-data-table-server
        data-testid="overdue-table"
        :headers="headers"
        :items="checkoutStore.overdueList"
        :items-length="checkoutStore.overdueTotal"
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

        <template #item.due_date="{ item }">
          <span class="text-error font-weight-medium">
            {{ formatDate(item.due_date) }}
          </span>
        </template>

        <template #item.days_overdue="{ item }">
          <v-chip color="error" size="small" variant="tonal">
            {{ getDaysOverdue(item.due_date) }} days
          </v-chip>
        </template>
      </v-data-table-server>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCheckoutStore } from '@/stores/checkout'
import PageHeader from '@/components/common/PageHeader.vue'

const checkoutStore = useCheckoutStore()

const page = ref(1)
const itemsPerPage = ref(20)

const headers = [
  { title: 'Item', key: 'item', sortable: false },
  { title: 'Borrower', key: 'borrower', sortable: false },
  { title: 'Qty', key: 'quantity', sortable: false },
  { title: 'Due Date', key: 'due_date', sortable: true },
  { title: 'Days Overdue', key: 'days_overdue', sortable: false },
  { title: 'Notes', key: 'notes', sortable: false },
]

function loadItems() {
  checkoutStore.fetchOverdue({
    skip: (page.value - 1) * itemsPerPage.value,
    limit: itemsPerPage.value,
  })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}

function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date()
  const diff = now.getTime() - due.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
</script>
