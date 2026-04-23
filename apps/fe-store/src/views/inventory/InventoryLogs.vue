<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { inventoryService, type InventoryLog, type LogFilter } from '@/services/inventory.service'
import { useAppToast } from '@/composables/useToast'
import { formatDateTime, formatNumber } from '@/utils/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'

interface InventoryLogView {
  id: string
  createdAt: string
  productName: string
  skuCode: string
  variantInfo: string
  type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN'
  quantity: number
  beforeStock: number
  afterStock: number
  note: string
}

const route = useRoute()
const router = useRouter()
const toast = useAppToast()

const loading = ref(true)
const logs = ref<InventoryLog[]>([])
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const filter = ref<LogFilter>({ page: 1, limit: 10, variant_id: undefined })
const typeFilter = ref<'IN' | 'OUT' | 'ADJUST' | 'RETURN' | undefined>()
const dateRange = ref<Date[] | null>(null)

const typeOptions = [
  { label: 'Nhập kho', value: 'IN' },
  { label: 'Xuất kho', value: 'OUT' },
  { label: 'Điều chỉnh', value: 'ADJUST' },
  { label: 'Trả hàng', value: 'RETURN' },
]

const buildVariantInfo = (variantValues?: any[]) => {
  const labels = (variantValues || [])
    .map((entry) => {
      const attributeName = entry?.attribute_value?.attribute?.name
      const value = entry?.attribute_value?.value
      if (!attributeName || !value) return ''
      return `${attributeName}: ${value}`
    })
    .filter(Boolean)

  return labels.length ? labels.join(' / ') : 'Phiên bản mặc định'
}

const normalizeLog = (log: InventoryLog): InventoryLogView => ({
  id: log.id,
  createdAt: log.created_at,
  productName: log.product_name || log.variant?.product?.name || 'Sản phẩm',
  skuCode: log.sku_code || log.variant?.sku_code || 'Chưa có SKU',
  variantInfo: buildVariantInfo(log.variant?.variant_values),
  type: log.type,
  quantity: Number(log.quantity || 0),
  beforeStock: Number(log.before_stock || 0),
  afterStock: Number(log.after_stock || 0),
  note: log.note || 'Không có ghi chú',
})

const normalizedLogs = computed(() => logs.value.map(normalizeLog))
const scopedVariantId = computed(() =>
  typeof route.query.variant_id === 'string' ? route.query.variant_id : undefined,
)
const scopedProductName = computed(() =>
  typeof route.query.product_name === 'string' ? route.query.product_name : '',
)
const scopedSku = computed(() =>
  typeof route.query.sku === 'string' ? route.query.sku : '',
)
const scopeLabel = computed(() => [scopedProductName.value, scopedSku.value].filter(Boolean).join(' • '))
const paginationText = computed(() => {
  const start = totalRecords.value ? (currentPage.value - 1) * pageSize.value + 1 : 0
  const end = Math.min(currentPage.value * pageSize.value, totalRecords.value)
  return `Hiển thị ${formatNumber(start)} - ${formatNumber(end)} trên tổng ${formatNumber(totalRecords.value)} bản ghi`
})

const parsePagedResult = (payload: any) => {
  const result = payload?.data || payload || {}
  const rows = Array.isArray(result.data)
    ? result.data
    : Array.isArray(result.items)
      ? result.items
      : Array.isArray(result)
        ? result
        : []

  return {
    rows,
    total: Number(result.meta?.total ?? result.total ?? rows.length),
  }
}

const fetchLogs = async () => {
  loading.value = true

  try {
    const params: LogFilter = {
      page: currentPage.value,
      limit: pageSize.value,
      variant_id: filter.value.variant_id,
      type: typeFilter.value,
      date_from: dateRange.value?.[0] ? dateRange.value[0].toISOString() : undefined,
      date_to: dateRange.value?.[1] ? dateRange.value[1].toISOString() : undefined,
    }

    const { data } = await inventoryService.getLogs(params)
    const parsed = parsePagedResult(data)
    logs.value = parsed.rows
    totalRecords.value = parsed.total
  } catch {
    toast.error('Không thể tải lịch sử tồn kho')
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  currentPage.value = 1
  fetchLogs()
}

const onPage = (event: any) => {
  currentPage.value = event.page + 1
  pageSize.value = event.rows
  fetchLogs()
}

const clearVariantScope = () => {
  router.replace({ path: '/inventory/logs' })
}

const resetAllFilters = () => {
  typeFilter.value = undefined
  dateRange.value = null
  if (scopedVariantId.value) {
    clearVariantScope()
    return
  }
  applyFilters()
}

watch(
  () => route.query,
  () => {
    filter.value.variant_id = scopedVariantId.value
    currentPage.value = 1
    fetchLogs()
  },
  { immediate: true },
)
</script>

<template>
  <div class="logs-page">
    <div class="logs-header">
      <div class="logs-heading">
        <Button icon="pi pi-arrow-left" text rounded @click="router.push('/inventory')" />
        <div>
          <p class="page-section-label">LỊCH SỬ TỒN KHO</p>
          <h1 class="logs-title">Nhật ký thay đổi tồn kho</h1>
          <p class="logs-subtitle">
            Theo dõi mọi lần nhập, xuất, điều chỉnh và hoàn hàng để kiểm soát chênh lệch tồn theo từng SKU.
          </p>
        </div>
      </div>

      <Button
        label="Về danh sách kho"
        icon="pi pi-warehouse"
        severity="secondary"
        outlined
        @click="router.push('/inventory')"
      />
    </div>

    <section v-if="scopeLabel" class="scope-banner app-card">
      <div>
        <span class="scope-label">ĐANG XEM THEO SKU</span>
        <strong class="scope-title">{{ scopeLabel }}</strong>
      </div>
      <Button label="Bỏ lọc SKU" text @click="clearVariantScope" />
    </section>

    <section class="logs-toolbar app-card">
      <div class="toolbar-group">
        <label class="toolbar-field">
          <span class="toolbar-label">LOẠI BIẾN ĐỘNG</span>
          <Select
            v-model="typeFilter"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Tất cả loại"
            showClear
            class="toolbar-select"
            @change="applyFilters"
          />
        </label>

        <label class="toolbar-field">
          <span class="toolbar-label">KHOẢNG NGÀY</span>
          <DatePicker
            v-model="dateRange"
            selectionMode="range"
            dateFormat="dd/mm/yy"
            placeholder="Chọn khoảng ngày"
            showIcon
            class="toolbar-select"
            @update:modelValue="applyFilters"
          />
        </label>
      </div>

      <div class="toolbar-actions">
        <Button
          label="Làm mới"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          @click="fetchLogs"
        />
        <Button
          label="Xóa bộ lọc"
          icon="pi pi-filter-slash"
          severity="secondary"
          text
          @click="resetAllFilters"
        />
      </div>
    </section>

    <section class="logs-table-card app-card">
      <div class="table-head">
        <div>
          <h2 class="table-title">Danh sách giao dịch kho</h2>
          <p class="table-subtitle">{{ paginationText }}</p>
        </div>
      </div>

      <DataTable
        :value="normalizedLogs"
        :loading="loading"
        :paginator="true"
        :rows="pageSize"
        :first="(currentPage - 1) * pageSize"
        :totalRecords="totalRecords"
        :lazy="true"
        stripedRows
        @page="onPage"
      >
        <template #empty>
          <EmptyState icon="pi pi-history" title="Chưa có lịch sử kho" />
        </template>

        <Column header="Thời gian" class="hide-mobile" style="width: 170px">
          <template #body="{ data }">
            <div class="date-cell">
              <strong>{{ formatDateTime(data.createdAt) }}</strong>
            </div>
          </template>
        </Column>

        <Column header="Sản phẩm / SKU" style="min-width: 260px">
          <template #body="{ data }">
            <div class="identity-cell">
              <strong class="identity-title">{{ data.productName }}</strong>
              <span class="identity-subline">{{ data.variantInfo }}</span>
              <span class="identity-sku">{{ data.skuCode }}</span>
            </div>
          </template>
        </Column>

        <Column header="Loại" style="width: 140px">
          <template #body="{ data }">
            <StatusBadge :status="data.type" />
          </template>
        </Column>

        <Column header="Biến động" style="width: 130px">
          <template #body="{ data }">
            <strong class="change-value" :class="data.type === 'OUT' ? 'change-out' : 'change-in'">
              {{ data.type === 'OUT' ? '-' : '+' }}{{ formatNumber(data.quantity) }}
            </strong>
          </template>
        </Column>

        <Column header="Tồn trước / sau" style="width: 160px">
          <template #body="{ data }">
            <div class="flow-cell">
              <strong>{{ formatNumber(data.beforeStock) }}</strong>
              <i class="pi pi-arrow-right"></i>
              <strong>{{ formatNumber(data.afterStock) }}</strong>
            </div>
          </template>
        </Column>

        <Column header="Ghi chú" class="hide-mobile" style="min-width: 220px">
          <template #body="{ data }">
            <span class="note-text">{{ data.note }}</span>
          </template>
        </Column>
      </DataTable>
    </section>
  </div>
</template>

<style scoped>
.logs-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.logs-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.logs-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.logs-title {
  font-size: clamp(1.6rem, 2vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  margin-top: -4px;
}

.logs-subtitle {
  margin-top: 8px;
  color: var(--text-muted);
  line-height: 1.7;
  max-width: 720px;
}

.scope-banner {
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.08), rgba(255, 215, 0, 0.12));
}

.scope-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-light);
}

.scope-title {
  display: block;
  margin-top: 6px;
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.logs-toolbar {
  padding: 18px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 14px;
  flex: 1;
}

.toolbar-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-light);
}

.toolbar-select {
  width: 100%;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
}

.table-head {
  padding: 20px 20px 0;
}

.table-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
}

.table-subtitle {
  margin-top: 4px;
  color: var(--text-muted);
}

.date-cell strong,
.identity-title {
  color: var(--text-primary);
}

.identity-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.identity-subline {
  color: var(--text-muted);
  line-height: 1.5;
}

.identity-sku {
  display: inline-flex;
  align-self: flex-start;
  padding: 5px 10px;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  color: #334155;
  font-size: 0.78rem;
  font-weight: 700;
}

.change-value {
  font-size: 1rem;
  font-weight: 800;
}

.change-in {
  color: #10b981;
}

.change-out {
  color: #ef4444;
}

.flow-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
}

.flow-cell i {
  color: var(--text-light);
}

.note-text {
  color: var(--text-muted);
  line-height: 1.6;
}

@media (max-width: 900px) {
  .logs-header,
  .scope-banner,
  .logs-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-group {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    width: 100%;
  }

  .toolbar-actions :deep(.p-button) {
    flex: 1;
  }
}
</style>
