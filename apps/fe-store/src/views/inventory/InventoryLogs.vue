<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { inventoryService, type LogFilter } from '@/services/inventory.service'
import { useAppToast } from '@/composables/useToast'
import { formatDateTime } from '@/utils/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import { useRouter } from 'vue-router'

const router = useRouter()
const toast = useAppToast()
const loading = ref(true)
const logs = ref<any[]>([])
const totalRecords = ref(0)

const filter = ref<LogFilter>({ page: 1, limit: 20 })
const typeFilter = ref<string | undefined>()
const dateRange = ref<Date[] | null>(null)

const typeOptions = [
  { label: 'Nhập kho', value: 'IN' },
  { label: 'Xuất kho', value: 'OUT' },
  { label: 'Điều chỉnh', value: 'ADJUST' },
  { label: 'Trả hàng', value: 'RETURN' },
]

const fetchLogs = async () => {
  loading.value = true
  try {
    const params: any = { ...filter.value }
    if (typeFilter.value) params.type = typeFilter.value
    if (dateRange.value?.[0]) params.date_from = dateRange.value[0].toISOString()
    if (dateRange.value?.[1]) params.date_to = dateRange.value[1].toISOString()
    const { data } = await inventoryService.getLogs(params)
    const result = data.data
    logs.value = result.data || result.items || result || []
    totalRecords.value = result.total || logs.value.length
  } catch {
    toast.error('Không thể tải lịch sử')
  } finally {
    loading.value = false
  }
}

const onPage = (e: any) => {
  filter.value.page = e.page + 1
  filter.value.limit = e.rows
  fetchLogs()
}

onMounted(fetchLogs)
</script>

<template>
  <div>
    <p class="page-section-label">LỊCH SỬ KHO</p>
    <div class="filter-bar mb-5">
      <Button icon="pi pi-arrow-left" text rounded @click="router.push('/inventory')" />
      <h3 class="text-base font-bold" style="color: var(--text-primary)">Lịch sử kho</h3>
      <div class="ml-auto flex items-center gap-3">
        <Select v-model="typeFilter" :options="typeOptions" optionLabel="label" optionValue="value" placeholder="Loại" showClear style="width: 120px" @change="fetchLogs" />
        <DatePicker v-model="dateRange" selectionMode="range" placeholder="Khoảng ngày" dateFormat="dd/mm/yy" showIcon class="hide-mobile" style="width: 220px" @date-select="fetchLogs" />
      </div>
    </div>

    <div class="app-card">
      <DataTable :value="logs" :loading="loading" :paginator="true" :rows="filter.limit" :totalRecords="totalRecords" :lazy="true" @page="onPage" class="text-sm" stripedRows>
        <template #empty><EmptyState icon="pi pi-history" title="Chưa có lịch sử" /></template>

        <Column header="Ngày" class="hide-mobile" style="width: 140px">
          <template #body="{ data }">{{ formatDateTime(data.created_at) }}</template>
        </Column>
        <Column header="Sản phẩm">
          <template #body="{ data }">
            <p class="font-semibold text-sm">{{ data.product_name || '—' }}</p>
            <p class="text-xs" style="color: var(--text-muted)">{{ data.sku_code || '' }}</p>
          </template>
        </Column>
        <Column header="Loại" style="width: 120px">
          <template #body="{ data }"><StatusBadge :status="data.type" /></template>
        </Column>
        <Column header="Số lượng" style="width: 100px; text-align: center">
          <template #body="{ data }">
            <span class="font-bold" :class="data.type === 'IN' || data.type === 'RETURN' ? 'text-green-600' : 'text-red-500'">
              {{ data.type === 'IN' || data.type === 'RETURN' ? '+' : '-' }}{{ data.quantity }}
            </span>
          </template>
        </Column>
        <Column header="Ghi chú" class="hide-mobile" style="min-width: 150px">
          <template #body="{ data }">{{ data.note || '—' }}</template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
