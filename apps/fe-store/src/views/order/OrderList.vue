<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { orderService, type OrderFilter } from '@/services/order.service'
import { useAppToast } from '@/composables/useToast'
import { formatVND, formatDateTime } from '@/utils/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const router = useRouter()
const toast = useAppToast()
const loading = ref(true)
const orders = ref<any[]>([])
const totalRecords = ref(0)
const statusCounts = ref<Record<string, number>>({})
const activeTab = ref<string | undefined>()

const filter = ref<OrderFilter>({ page: 1, limit: 20, search: '', sort_order: 'desc' })

const tabs = [
  { label: 'Tất cả', value: undefined },
  { label: 'Chờ xử lý', value: 'PENDING' },
  { label: 'Đang xử lý', value: 'PROCESSING' },
  { label: 'Đang giao', value: 'SHIPPED' },
  { label: 'Đã giao', value: 'DELIVERED' },
  { label: 'Đã hủy', value: 'CANCELLED' },
]

const fetchCountByStatus = async () => {
  try {
    const { data } = await orderService.countByStatus()
    statusCounts.value = data.data || {}
  } catch { /* ignore */ }
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const params = { ...filter.value, order_status: activeTab.value }
    const { data } = await orderService.getAll(params)
    const result = data.data
    orders.value = result.data || result.items || result || []
    totalRecords.value = result.total || orders.value.length
  } catch { toast.error('Không thể tải đơn hàng') }
  finally { loading.value = false }
}

const selectTab = (value: string | undefined) => {
  activeTab.value = value
  filter.value.page = 1
  fetchOrders()
}

const onPage = (e: any) => { filter.value.page = e.page + 1; filter.value.limit = e.rows; fetchOrders() }

const viewDetail = (e: any) => { router.push(`/orders/${e.data.id}`) }

onMounted(async () => {
  await Promise.all([fetchCountByStatus(), fetchOrders()])
})
</script>

<template>
  <div>
    <!-- Status tabs -->
    <div class="flex items-center gap-2 mb-5 overflow-x-auto">
      <button
        v-for="tab in tabs"
        :key="tab.label"
        class="tab-btn"
        :class="{ active: activeTab === tab.value }"
        @click="selectTab(tab.value)"
      >
        {{ tab.label }}
        <span v-if="tab.value && statusCounts[tab.value]" class="tab-count">{{ statusCounts[tab.value] }}</span>
      </button>
    </div>

    <!-- Search -->
    <div class="flex items-center justify-between mb-4">
      <InputText v-model="filter.search" placeholder="Tìm theo tên, SĐT..." class="w-64" @keyup.enter="fetchOrders" />
    </div>

    <div class="app-card">
      <DataTable :value="orders" :loading="loading" :paginator="true" :rows="filter.limit" :totalRecords="totalRecords" :lazy="true" @page="onPage" class="text-sm" stripedRows @row-click="viewDetail" style="cursor: pointer">
        <template #empty><EmptyState icon="pi pi-receipt" title="Chưa có đơn hàng" /></template>

        <Column header="Mã đơn" style="width: 130px">
          <template #body="{ data }">
            <span class="font-bold text-xs" style="color: var(--primary)">{{ data.order_code || data.id?.slice(0, 8) }}</span>
          </template>
        </Column>
        <Column header="Khách hàng" style="min-width: 180px">
          <template #body="{ data }">
            <p class="font-semibold text-sm">{{ data.customer_name || '—' }}</p>
            <p class="text-xs" style="color: var(--text-muted)">{{ data.customer_phone || '' }}</p>
          </template>
        </Column>
        <Column header="Tổng tiền" style="width: 140px">
          <template #body="{ data }"><span class="font-semibold">{{ formatVND(data.total_amount || 0) }}</span></template>
        </Column>
        <Column header="Đơn hàng" style="width: 110px">
          <template #body="{ data }"><StatusBadge :status="data.order_status" /></template>
        </Column>
        <Column header="Thanh toán" style="width: 120px">
          <template #body="{ data }"><StatusBadge :status="data.payment_status" /></template>
        </Column>
        <Column header="Phương thức" style="width: 90px">
          <template #body="{ data }"><StatusBadge :status="data.payment_method" /></template>
        </Column>
        <Column header="Ngày" style="width: 140px">
          <template #body="{ data }">{{ formatDateTime(data.created_at) }}</template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border);
  background: #fff; font-size: 0.8rem; font-weight: 500; cursor: pointer;
  color: var(--text-muted); transition: all 0.2s; white-space: nowrap;
}
.tab-btn:hover { border-color: var(--primary); color: var(--primary); }
.tab-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.tab-count { font-size: 0.7rem; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 10px; }
.tab-btn:not(.active) .tab-count { background: #F3F4F6; }
</style>
