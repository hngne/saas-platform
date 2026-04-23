<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { categoryService, type Category } from '@/services/category.service'
import { inventoryService, type InventoryFilter, type InventoryItem } from '@/services/inventory.service'
import { useAppToast } from '@/composables/useToast'
import { formatNumber } from '@/utils/format'
import AdjustModal from '@/components/inventory/AdjustModal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Select from 'primevue/select'

const LOW_STOCK_THRESHOLD = 5

type InventoryStatus = 'healthy' | 'low' | 'out'

interface InventoryViewItem {
  variantId: string
  productId?: string
  productName: string
  skuCode: string
  stock: number
  threshold: number
  categoryId?: string
  categoryName: string
  variantInfo: string
  imageUrl: string
  status: InventoryStatus
}

const router = useRouter()
const toast = useAppToast()

const loading = ref(true)
const items = ref<InventoryItem[]>([])
const rawCategories = ref<Category[]>([])
const totalRecords = ref(0)
const overallTotal = ref(0)
const lowStockTotal = ref(0)
const outOfStockTotal = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const showAdjust = ref(false)
const selectedItem = ref<InventoryViewItem | null>(null)
const activeTab = ref<'all' | 'low'>('all')
const filter = ref<InventoryFilter>({
  search: '',
  category_id: undefined,
  sort_order: 'asc',
})

let searchTimer: ReturnType<typeof setTimeout> | undefined

const sortOptions = [
  { label: 'Tồn kho thấp đến cao', value: 'asc' },
  { label: 'Tồn kho cao đến thấp', value: 'desc' },
]

const getCategoryById = (categoryId?: string | null) =>
  rawCategories.value.find((category) => category.id === categoryId)

const getCategoryPath = (categoryId?: string | null) => {
  if (!categoryId) return ''

  const labels: string[] = []
  let current = getCategoryById(categoryId)
  const visited = new Set<string>()

  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    labels.unshift(current.name)
    current = current.parent_id ? getCategoryById(current.parent_id) : undefined
  }

  return labels.join(' / ')
}

const countDescendants = (categoryId?: string | null) => {
  if (!categoryId) return 0

  const queue = [categoryId]
  const visited = new Set<string>()
  let count = 0

  while (queue.length) {
    const currentId = queue.shift()
    if (!currentId || visited.has(currentId)) continue
    visited.add(currentId)

    const childIds = rawCategories.value
      .filter((category) => category.parent_id === currentId)
      .map((category) => category.id)

    count += childIds.length
    queue.push(...childIds)
  }

  return count
}

const categoryOptions = computed(() =>
  rawCategories.value.map((category) => {
    const path = getCategoryPath(category.id)
    const descendantCount = countDescendants(category.id)

    return {
      label: descendantCount > 0 ? `${path} (${descendantCount} danh mục con)` : path,
      value: category.id,
    }
  }),
)

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

const normalizeInventoryItem = (item: InventoryItem): InventoryViewItem => {
  const stock = Number(item.stock || 0)
  const threshold = Number(item.low_stock_threshold || LOW_STOCK_THRESHOLD)

  let status: InventoryStatus = 'healthy'
  if (stock <= 0) status = 'out'
  else if (stock <= threshold) status = 'low'

  return {
    variantId: item.variant_id || item.id || '',
    productId: item.product_id || item.product?.id,
    productName: item.product_name || item.product?.name || 'Sản phẩm chưa đặt tên',
    skuCode: item.sku_code || 'Chưa có SKU',
    stock,
    threshold,
    categoryId: item.product?.category?.id,
    categoryName: item.category_name || item.product?.category?.name || 'Chưa phân loại',
    variantInfo: item.variant_info || buildVariantInfo(item.variant_values) || 'Phiên bản mặc định',
    imageUrl: item.image_url || item.product?.images?.[0]?.image_url || '',
    status,
  }
}

const normalizedItems = computed(() => items.value.map(normalizeInventoryItem))
const healthyStockTotal = computed(() => Math.max(overallTotal.value - lowStockTotal.value, 0))
const visibleOutOfStock = computed(() => normalizedItems.value.filter((item) => item.status === 'out').length)
const selectedCategory = computed(() =>
  rawCategories.value.find((category) => category.id === filter.value.category_id),
)
const selectedCategoryNotice = computed(() => {
  if (!selectedCategory.value) return ''

  const categoryPath = getCategoryPath(selectedCategory.value.id)
  const descendantCount = countDescendants(selectedCategory.value.id)

  if (descendantCount > 0) {
    return `Đang lọc theo danh mục cha "${categoryPath}", bao gồm thêm ${formatNumber(descendantCount)} danh mục con.`
  }

  return `Đang lọc đúng danh mục "${categoryPath}".`
})
const paginationText = computed(() => {
  const start = totalRecords.value ? (currentPage.value - 1) * pageSize.value + 1 : 0
  const end = Math.min(currentPage.value * pageSize.value, totalRecords.value)
  return `Hiển thị ${formatNumber(start)} - ${formatNumber(end)} trên tổng ${formatNumber(totalRecords.value)} SKU`
})

const inventoryTabs = computed(() => [
  { key: 'all' as const, label: 'Tất cả', count: overallTotal.value },
  { key: 'low' as const, label: 'Sắp hết hàng', count: lowStockTotal.value },
])

const statusMeta: Record<InventoryStatus, { label: string; helper: string }> = {
  healthy: { label: 'Còn hàng', helper: 'Mức tồn ổn định' },
  low: { label: 'Sắp hết', helper: 'Nên nhập thêm sớm' },
  out: { label: 'Hết hàng', helper: 'Cần xử lý ngay' },
}

const getStatusLabel = (status: InventoryStatus | string) =>
  statusMeta[status as InventoryStatus]?.label || 'Chưa xác định'

const getStatusHelper = (status: InventoryStatus | string) =>
  statusMeta[status as InventoryStatus]?.helper || 'Kiểm tra lại dữ liệu tồn kho'

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

const fetchInventory = async () => {
  loading.value = true

  try {
    const params: InventoryFilter = {
      page: currentPage.value,
      limit: pageSize.value,
      search: filter.value.search?.trim() || undefined,
      category_id: filter.value.category_id,
      sort_order: filter.value.sort_order || 'asc',
      low_stock: activeTab.value === 'low' ? 'true' : undefined,
    }

    const { data } = await inventoryService.getAll(params)
    const parsed = parsePagedResult(data)
    items.value = parsed.rows
    totalRecords.value = parsed.total
  } catch {
    toast.error('Không thể tải danh sách tồn kho')
  } finally {
    loading.value = false
  }
}

const fetchOverview = async () => {
  try {
    const [{ data: inventoryData }, { data: lowStockData }] = await Promise.all([
      inventoryService.getAll({ page: 1, limit: 1, sort_order: 'asc' }),
      inventoryService.getLowStock(),
    ])

    overallTotal.value = parsePagedResult(inventoryData).total

    const lowStockRows = Array.isArray(lowStockData?.data) ? lowStockData.data : []
    lowStockTotal.value = lowStockRows.length
    outOfStockTotal.value = lowStockRows.filter((item: InventoryItem) => Number(item.stock || 0) <= 0).length
  } catch {
    overallTotal.value = totalRecords.value
    lowStockTotal.value = normalizedItems.value.filter((item) => item.status !== 'healthy').length
    outOfStockTotal.value = normalizedItems.value.filter((item) => item.status === 'out').length
  }
}

const fetchCategories = async () => {
  try {
    const { data } = await categoryService.getAll()
    rawCategories.value = data.data || []
  } catch {
    rawCategories.value = []
  }
}

const refreshData = async () => {
  await Promise.all([fetchInventory(), fetchOverview()])
}

const applyFilters = () => {
  currentPage.value = 1
  fetchInventory()
}

const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    applyFilters()
  }, 350)
}

const onPage = (event: any) => {
  currentPage.value = event.page + 1
  pageSize.value = event.rows
  fetchInventory()
}

const setTab = (tab: 'all' | 'low') => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  applyFilters()
}

const openAdjust = (item: InventoryViewItem) => {
  selectedItem.value = item
  showAdjust.value = true
}

const viewLogs = (item: InventoryViewItem) => {
  router.push({
    path: '/inventory/logs',
    query: {
      variant_id: item.variantId,
      product_name: item.productName,
      sku: item.skuCode !== 'Chưa có SKU' ? item.skuCode : undefined,
    },
  })
}

const goToProduct = (item: InventoryViewItem) => {
  if (!item.productId) return
  router.push(`/products/${item.productId}`)
}

const getCategoryDisplay = (item: InventoryViewItem) =>
  getCategoryPath(item.categoryId) || item.categoryName

const escapeCsv = (value: string | number) => {
  const normalized = String(value ?? '').replace(/"/g, '""')
  return `"${normalized}"`
}

const downloadBlobFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const exportVisibleRows = () => {
  if (!normalizedItems.value.length) {
    toast.warn('Không có dữ liệu để xuất')
    return
  }

  const headers = ['Sản phẩm', 'Biến thể', 'SKU', 'Danh mục', 'Tồn kho', 'Trạng thái']
  const rows = normalizedItems.value.map((item) => [
    item.productName,
    item.variantInfo,
    item.skuCode,
    item.categoryName,
    item.stock,
    getStatusLabel(item.status),
  ])

  const csv = `\uFEFF${[headers, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
    .join('\r\n')}`

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlobFile(blob, `inventory-${new Date().toISOString().slice(0, 10)}.csv`)

  toast.success('Đã xuất CSV cho danh sách đang hiển thị')
}

const exportPdf = async () => {
  try {
    const params: InventoryFilter = {
      search: filter.value.search?.trim() || undefined,
      category_id: filter.value.category_id,
      sort_order: filter.value.sort_order || 'asc',
      low_stock: activeTab.value === 'low' ? 'true' : undefined,
    }

    const response = await inventoryService.exportPdf(params)
    const filenameMatch = response.headers?.['content-disposition']?.match(/filename="?(.*?)"?$/i)
    const filename = filenameMatch?.[1] || `inventory-${new Date().toISOString().slice(0, 10)}.pdf`
    const blob = new Blob([response.data], { type: 'application/pdf' })

    downloadBlobFile(blob, filename)
    toast.success('Đã xuất báo cáo PDF')
  } catch {
    toast.error('Không thể xuất PDF tồn kho')
  }
}

const onAdjusted = async () => {
  showAdjust.value = false
  await refreshData()
}

onMounted(async () => {
  await Promise.all([fetchCategories(), refreshData()])
})
</script>

<template>
  <div class="inventory-page">
    <div class="page-header inventory-header">
      <div>
        <h1 class="page-title">Quản lý tồn kho theo từng SKU</h1>
        <p class="page-subtitle">
          Theo dõi nhanh mức tồn, ưu tiên các SKU sắp hết và thao tác nhập, xuất, trả hàng ngay trên cùng một màn hình.
        </p>
      </div>

      <div class="inventory-header-actions">
        <Button
          label="Lịch sử kho"
          icon="pi pi-history"
          severity="secondary"
          outlined
          @click="router.push('/inventory/logs')"
        />
        <Button
          label="Xuất CSV"
          icon="pi pi-download"
          severity="secondary"
          outlined
          :disabled="!normalizedItems.length"
          @click="exportVisibleRows"
        />
        <Button
          label="Xuất PDF"
          icon="pi pi-file-pdf"
          severity="danger"
          outlined
          :disabled="!normalizedItems.length"
          @click="exportPdf"
        />
      </div>
    </div>

    <section class="inventory-overview">
      <article class="overview-card app-card">
        <div class="overview-copy">
          <span class="overview-label">TỔNG SKU</span>
          <strong class="overview-value">{{ formatNumber(overallTotal) }}</strong>
          <span class="overview-note">Tổng số biến thể đang được quản lý</span>
        </div>
        <div class="overview-icon tone-primary">
          <i class="pi pi-box"></i>
        </div>
      </article>

      <article class="overview-card app-card">
        <div class="overview-copy">
          <span class="overview-label">CÒN HÀNG ỔN ĐỊNH</span>
          <strong class="overview-value">{{ formatNumber(healthyStockTotal) }}</strong>
          <span class="overview-note">Mức tồn lớn hơn ngưỡng cảnh báo</span>
        </div>
        <div class="overview-icon tone-success">
          <i class="pi pi-check-circle"></i>
        </div>
      </article>

      <article class="overview-card app-card">
        <div class="overview-copy">
          <span class="overview-label">SẮP HẾT HÀNG</span>
          <strong class="overview-value">{{ formatNumber(lowStockTotal) }}</strong>
          <span class="overview-note">Tồn kho nhỏ hơn hoặc bằng {{ LOW_STOCK_THRESHOLD }}</span>
        </div>
        <div class="overview-icon tone-warning">
          <i class="pi pi-exclamation-triangle"></i>
        </div>
      </article>

      <article class="overview-card app-card">
        <div class="overview-copy">
          <span class="overview-label">HẾT HÀNG</span>
          <strong class="overview-value">{{ formatNumber(outOfStockTotal) }}</strong>
          <span class="overview-note">Ưu tiên xử lý các SKU đã về 0</span>
        </div>
        <div class="overview-icon tone-danger">
          <i class="pi pi-times-circle"></i>
        </div>
      </article>
    </section>

    <section class="inventory-toolbar app-card">
      <div class="inventory-tabs">
        <button
          v-for="tab in inventoryTabs"
          :key="tab.key"
          type="button"
          class="inventory-tab"
          :class="{ active: activeTab === tab.key }"
          @click="setTab(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <strong>{{ formatNumber(tab.count) }}</strong>
        </button>
      </div>

      <div class="toolbar-grid">
        <label class="filter-block search-block">
          <span class="filter-label">TÌM KIẾM</span>
          <div class="search-input-wrap">
            <i class="pi pi-search search-icon"></i>
            <input
              v-model="filter.search"
              type="text"
              class="search-input"
              placeholder="Tìm theo tên sản phẩm hoặc SKU"
              @input="onSearchInput"
            />
          </div>
        </label>

        <label class="filter-block">
          <span class="filter-label">DANH MỤC</span>
          <Select
            v-model="filter.category_id"
            :options="categoryOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Tất cả danh mục"
            showClear
            class="filter-select"
            @change="applyFilters"
          />
        </label>

        <label class="filter-block">
          <span class="filter-label">SẮP XẾP TỒN</span>
          <Select
            v-model="filter.sort_order"
            :options="sortOptions"
            optionLabel="label"
            optionValue="value"
            class="filter-select"
            @change="applyFilters"
          />
        </label>

        <div class="toolbar-actions">
          <Button
            label="Làm mới"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            @click="refreshData"
          />
        </div>
      </div>
    </section>

    <section v-if="selectedCategoryNotice" class="inventory-scope app-card">
      <div>
        <span class="scope-overline">PHẠM VI DANH MỤC</span>
        <strong class="scope-title">{{ selectedCategoryNotice }}</strong>
      </div>
      <span class="scope-meta">Bộ lọc cha/con đã được áp dụng cho danh sách tồn kho.</span>
    </section>

    <section class="inventory-table-card app-card">
      <div class="table-head">
        <div>
          <h2 class="table-title">Danh sách tồn kho</h2>
          <p class="table-subtitle">{{ paginationText }}</p>
        </div>
        <div class="table-summary hide-mobile">
          <span>Hiển thị hết hàng: <strong>{{ formatNumber(visibleOutOfStock) }}</strong></span>
        </div>
      </div>

      <DataTable
        :value="normalizedItems"
        :loading="loading"
        :paginator="true"
        :rows="pageSize"
        :first="(currentPage - 1) * pageSize"
        :totalRecords="totalRecords"
        :lazy="true"
        scrollable
        stripedRows
        @page="onPage"
      >
        <template #empty>
          <EmptyState icon="pi pi-warehouse" title="Chưa có dữ liệu tồn kho" />
        </template>

        <Column header="Sản phẩm" style="min-width: 320px">
          <template #body="{ data }">
            <div class="product-cell">
              <div class="product-thumb">
                <img v-if="data.imageUrl" :src="data.imageUrl" :alt="data.productName" />
                <i v-else class="pi pi-image"></i>
              </div>

              <div class="product-copy">
                <button type="button" class="product-link" @click="goToProduct(data)">
                  {{ data.productName }}
                </button>
                <p class="product-subline">{{ getCategoryDisplay(data) }}</p>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Biến thể" style="min-width: 220px">
          <template #body="{ data }">
            <span class="variant-text">{{ data.variantInfo }}</span>
          </template>
        </Column>

        <Column header="SKU" class="hide-mobile" style="width: 160px">
          <template #body="{ data }">
            <span class="sku-chip">{{ data.skuCode }}</span>
          </template>
        </Column>

        <Column header="Tồn kho" style="width: 140px">
          <template #body="{ data }">
            <div class="stock-cell">
              <strong class="stock-value" :class="`stock-${data.status}`">{{ formatNumber(data.stock) }}</strong>
              <span class="stock-helper">Ngưỡng cảnh báo {{ data.threshold }}</span>
            </div>
          </template>
        </Column>

        <Column header="Trạng thái" style="width: 160px">
          <template #body="{ data }">
            <span class="status-pill" :class="`status-${data.status}`">
              <span class="status-dot"></span>
              {{ getStatusLabel(data.status) }}
            </span>
            <p class="status-helper">{{ getStatusHelper(data.status) }}</p>
          </template>
        </Column>

        <Column header="Thao tác" style="width: 180px">
          <template #body="{ data }">
            <div class="action-group">
              <button type="button" class="row-action row-action-muted" @click="viewLogs(data)">
                Xem log
              </button>
              <button type="button" class="row-action row-action-primary" @click="openAdjust(data)">
                Điều chỉnh
              </button>
            </div>
          </template>
        </Column>
      </DataTable>
    </section>

    <AdjustModal v-model:visible="showAdjust" :item="selectedItem" @adjusted="onAdjusted" />
  </div>
</template>

<style scoped>
.inventory-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.inventory-header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.inventory-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.overview-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px;
}

.overview-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.overview-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-light);
}

.overview-value {
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.overview-note {
  color: var(--text-muted);
  line-height: 1.5;
}

.overview-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 1.15rem;
}

.tone-primary {
  background: #fff3ed;
  color: var(--primary);
}

.tone-success {
  background: #ecfdf5;
  color: #10b981;
}

.tone-warning {
  background: #fffbeb;
  color: #f59e0b;
}

.tone-danger {
  background: #fef2f2;
  color: #ef4444;
}

.inventory-toolbar {
  padding: 18px;
}

.inventory-tabs {
  display: inline-flex;
  gap: 10px;
  padding: 6px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
}

.inventory-tab {
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 12px;
  padding: 10px 14px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.inventory-tab strong {
  min-width: 28px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff;
  color: var(--text-primary);
  font-size: 0.78rem;
}

.inventory-tab.active {
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.12), rgba(255, 215, 0, 0.18));
  color: var(--primary-dark);
  box-shadow: inset 0 0 0 1px rgba(255, 107, 43, 0.2);
}

.toolbar-grid {
  display: grid;
  grid-template-columns: minmax(280px, 2fr) minmax(200px, 1fr) minmax(220px, 1fr) auto;
  gap: 14px;
  margin-top: 16px;
  align-items: end;
  min-width: 0;
}

.filter-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-light);
}

.search-input-wrap {
  position: relative;
  min-width: 0;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  color: var(--text-light);
}

.search-input {
  width: 100%;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--border);
  padding: 0 14px 0 42px;
  background: #fff;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255, 107, 43, 0.08);
}

.filter-select {
  width: 100%;
}

.toolbar-actions {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.toolbar-actions :deep(.p-button) {
  width: 100%;
  min-height: 44px;
}

.inventory-table-card {
  overflow: hidden;
}

.inventory-table-card :deep(.p-datatable-wrapper) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.inventory-table-card :deep(.p-datatable-table) {
  min-width: 980px;
}

.inventory-table-card :deep(.p-paginator) {
  flex-wrap: wrap;
  row-gap: 8px;
  border-top: 1px solid #f1f5f9;
}

.inventory-scope {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.08), rgba(255, 215, 0, 0.1));
}

.scope-overline {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-light);
}

.scope-title {
  display: block;
  margin-top: 6px;
  color: var(--text-primary);
  font-size: 0.98rem;
  font-weight: 800;
}

.scope-meta {
  color: var(--text-muted);
  font-size: 0.88rem;
  text-align: right;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 0;
}

.table-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
}

.table-subtitle {
  color: var(--text-muted);
  margin-top: 4px;
}

.table-summary {
  color: var(--text-muted);
  font-size: 0.92rem;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 14px;
}

.product-thumb {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: var(--text-light);
  flex-shrink: 0;
}

.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.product-link {
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
}

.product-link:hover {
  color: var(--primary-dark);
}

.product-subline {
  color: var(--text-muted);
  font-size: 0.84rem;
}

.variant-text {
  color: var(--text-primary);
  line-height: 1.6;
}

.sku-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  font-size: 0.78rem;
  font-weight: 700;
  color: #334155;
}

.stock-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stock-value {
  font-size: 1.1rem;
  font-weight: 800;
}

.stock-helper {
  font-size: 0.78rem;
  color: var(--text-light);
}

.stock-healthy {
  color: #10b981;
}

.stock-low {
  color: #f59e0b;
}

.stock-out {
  color: #ef4444;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-healthy {
  background: #ecfdf5;
  color: #0f766e;
}

.status-healthy .status-dot {
  background: #10b981;
}

.status-low {
  background: #fffbeb;
  color: #b45309;
}

.status-low .status-dot {
  background: #f59e0b;
}

.status-out {
  background: #fef2f2;
  color: #dc2626;
}

.status-out .status-dot {
  background: #ef4444;
}

.status-helper {
  margin-top: 6px;
  color: var(--text-light);
  font-size: 0.76rem;
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row-action {
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.row-action-muted {
  background: #f8fafc;
  color: var(--text-primary);
}

.row-action-muted:hover {
  background: #eef2f7;
}

.row-action-primary {
  background: linear-gradient(135deg, #ff6b2b, #ff9f4a);
  color: #fff;
  box-shadow: 0 8px 16px rgba(255, 107, 43, 0.2);
}

.row-action-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(255, 107, 43, 0.28);
}

@media (max-width: 1200px) {
  .inventory-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toolbar-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .inventory-header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .inventory-header-actions :deep(.p-button) {
    flex: 1;
  }

  .inventory-overview {
    grid-template-columns: 1fr;
  }

  .inventory-scope {
    flex-direction: column;
    align-items: flex-start;
  }

  .scope-meta {
    text-align: left;
  }

  .inventory-toolbar {
    padding: 14px;
  }

  .inventory-tabs {
    width: 100%;
    flex-direction: column;
  }

  .inventory-tab {
    justify-content: space-between;
  }

  .toolbar-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    justify-content: stretch;
  }

  .table-head {
    padding: 18px 16px 0;
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .inventory-page {
    gap: 14px;
  }

  .inventory-header-actions {
    flex-direction: column;
  }

  .inventory-header-actions :deep(.p-button) {
    width: 100%;
  }

  .overview-card {
    padding: 16px;
  }

  .overview-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
  }

  .inventory-tabs {
    gap: 8px;
  }

  .inventory-tab {
    padding: 10px 12px;
  }

  .toolbar-grid {
    gap: 12px;
  }

  .table-head {
    padding: 16px 14px 0;
  }

  .inventory-table-card :deep(.p-datatable-wrapper),
  .inventory-table-card :deep(.p-datatable-table-container) {
    overflow-x: visible;
  }

  .inventory-table-card :deep(.p-datatable-table) {
    display: block;
    width: 100%;
    min-width: 0;
  }

  .inventory-table-card :deep(.p-datatable-thead) {
    display: none;
  }

  .inventory-table-card :deep(.p-datatable-tbody) {
    display: grid;
    gap: 12px;
    padding: 12px;
  }

  .inventory-table-card :deep(.p-datatable-tbody > tr) {
    display: block;
    border: 1px solid #f1f5f9;
    border-radius: 14px;
    background: #fff;
    overflow: hidden;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
  }

  .inventory-table-card :deep(.p-datatable-tbody > tr > td) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    border-bottom: 1px solid #f1f5f9;
    text-align: right;
  }

  .inventory-table-card :deep(.p-datatable-tbody > tr > td:last-child) {
    border-bottom: 0;
  }

  .inventory-table-card :deep(.p-datatable-tbody > tr > td:first-child) {
    display: block;
    text-align: left;
    padding-bottom: 14px;
  }

  .inventory-table-card :deep(.p-datatable-tbody > tr > td::before) {
    content: "";
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #94a3b8;
    text-transform: uppercase;
    flex-shrink: 0;
    text-align: left;
  }

  .inventory-table-card :deep(.p-datatable-tbody > tr > td:first-child::before),
  .inventory-table-card :deep(.p-datatable-tbody > tr > td.hide-mobile::before) {
    display: none;
  }

  .inventory-table-card :deep(.p-datatable-tbody > tr > td:nth-child(2)::before) {
    content: "Biến thể";
  }

  .inventory-table-card :deep(.p-datatable-tbody > tr > td:nth-child(4)::before) {
    content: "Tồn kho";
  }

  .inventory-table-card :deep(.p-datatable-tbody > tr > td:nth-child(5)::before) {
    content: "Trạng thái";
  }

  .inventory-table-card :deep(.p-datatable-tbody > tr > td:nth-child(6)::before) {
    content: "Thao tác";
  }

  .product-cell {
    align-items: flex-start;
  }

  .product-copy {
    flex: 1;
  }

  .product-link {
    max-width: 100%;
  }

  .variant-text {
    max-width: 62%;
    text-align: right;
  }

  .stock-cell {
    align-items: flex-end;
  }

  .status-helper {
    text-align: right;
  }

  .action-group {
    width: 100%;
    max-width: 170px;
  }

  .row-action {
    width: 100%;
  }

  .inventory-table-card :deep(.p-paginator) {
    justify-content: center;
    padding: 12px 8px;
  }
}
</style>
