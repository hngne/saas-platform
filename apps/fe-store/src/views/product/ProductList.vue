<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { productService, type Product, type ProductFilter } from '@/services/product.service'
import { categoryService, type Category } from '@/services/category.service'
import { useAppToast } from '@/composables/useToast'
import { formatVND, formatNumber } from '@/utils/format'
import { buildCategoryPath, countCategoryDescendants, mapCategoryOptionsWithPath } from '@/utils/category'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'

const router = useRouter()
const toast = useAppToast()
const loading = ref(true)
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
let searchTimer: any = null

const filter = ref<ProductFilter>({
  page: 1,
  limit: 10,
  search: '',
  sort_by: 'created_at',
  sort_order: 'desc',
})

// Delete
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Product | null>(null)

// Stats
const totalProducts = computed(() => totalRecords.value)
const activeProducts = computed(() => products.value.filter(p => p.is_active).length)
const lowStockProducts = computed(() => products.value.filter(p => getStock(p) <= 5 && getStock(p) >= 0).length)

const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize.value)))
const categoryOptions = computed(() => mapCategoryOptionsWithPath(categories.value))
const selectedCategory = computed(() =>
  categories.value.find(category => category.id === filter.value.category_id),
)
const selectedCategoryNotice = computed(() => {
  if (!selectedCategory.value) return ''

  const path = buildCategoryPath(categories.value, selectedCategory.value.id)
  const descendantCount = countCategoryDescendants(categories.value, selectedCategory.value.id)

  if (descendantCount > 0) {
    return `Đang lọc theo danh mục cha "${path}", bao gồm thêm ${formatNumber(descendantCount)} danh mục con.`
  }

  return `Đang lọc đúng danh mục "${path}".`
})
const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, totalRecords.value)
  return `Hiển thị ${totalRecords.value > 0 ? start : 0} - ${end} trong tổng số ${totalRecords.value} sản phẩm`
})
const pageNumbers = computed(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (cur > 3) pages.push('...')
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
    if (cur < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages
})

const fetchProducts = async () => {
  loading.value = true
  try {
    filter.value.page = currentPage.value
    filter.value.limit = pageSize.value
    const { data } = await productService.getAll(filter.value)
    const result = data.data
    products.value = result.data || result.items || result || []
    totalRecords.value = Number(result.meta?.total ?? result.total ?? result.totalItems ?? products.value.length)
  } catch {
    toast.error('Không thể tải sản phẩm')
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const { data } = await categoryService.getAll()
    categories.value = data.data || []
  } catch { /* ignore */ }
}

const onSearchInput = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchProducts()
  }, 400)
}

const onFilterChange = () => {
  currentPage.value = 1
  fetchProducts()
}

const goToPage = (p: number | string) => {
  if (typeof p !== 'number') return
  currentPage.value = p
  fetchProducts()
}

const toggleActive = async (prod: Product) => {
  try {
    await productService.toggleActive(prod.id, !prod.is_active)
    prod.is_active = !prod.is_active
    toast.success(prod.is_active ? 'Đã kích hoạt' : 'Đã tắt')
  } catch {
    toast.error('Cập nhật thất bại')
  }
}

const confirmDelete = (prod: Product) => {
  deleteTarget.value = prod
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return
  try {
    await productService.delete(deleteTarget.value.id)
    toast.success('Đã xóa sản phẩm')
    fetchProducts()
  } catch {
    toast.error('Xóa thất bại')
  }
}

const getStock = (prod: Product) => {
  if (!prod.has_variant || !prod.variants?.length) return 0
  return prod.variants.reduce((s, v) => s + (v.stock || 0), 0)
}

const getVariantBadge = (prod: Product) => {
  if (!prod.has_variant) return { text: 'Đơn bản', cls: 'badge-gray' }
  return { text: 'Có variant', cls: 'badge-blue' }
}

const getCategoryBadge = (cat: string) => {
  if (!cat) return ''
  return cat.length > 12 ? cat.substring(0, 12) + '…' : cat
}

const getCategoryDisplay = (prod: Product) =>
  buildCategoryPath(categories.value, prod.category?.id) || prod.category?.name || ''

onMounted(() => {
  fetchProducts()
  fetchCategories()
})
</script>

<template>
  <div class="product-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Quản lý Sản phẩm</h1>
        <p class="page-subtitle">Quản lý kho hàng, giá cả và trạng thái hiển thị của các sản phẩm.</p>
      </div>
      <Button
        label="Thêm sản phẩm"
        icon="pi pi-plus"
        class="btn-create-unified add-btn"
        @click="router.push('/products/new')"
      />
    </div>

    <!-- Filter Bar -->
    <div class="filter-section app-card">
      <div class="filter-left">
        <div class="search-wrap">
          <i class="pi pi-search search-icon"></i>
          <input
            v-model="filter.search"
            placeholder="Tìm tên, slug, SKU..."
            class="search-input"
            @input="onSearchInput"
          />
        </div>
      </div>
      <div class="filter-right">
        <div class="filter-group">
          <label class="filter-label">DANH MỤC</label>
          <Select
            v-model="filter.category_id"
            :options="categoryOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Tất cả danh mục"
            showClear
            class="filter-select"
            @change="onFilterChange"
          />
        </div>
        <div class="filter-group">
          <label class="filter-label">TRẠNG THÁI</label>
          <Select
            v-model="filter.is_active"
            :options="[{ label: 'Hoạt động', value: 'true' }, { label: 'Ngừng bán', value: 'false' }]"
            optionLabel="label"
            optionValue="value"
            placeholder="Tất cả trạng thái"
            showClear
            class="filter-select"
            @change="onFilterChange"
          />
        </div>
      </div>
    </div>

    <div v-if="selectedCategoryNotice" class="scope-banner app-card">
      <div>
        <span class="scope-overline">PHẠM VI DANH MỤC</span>
        <strong class="scope-title">{{ selectedCategoryNotice }}</strong>
      </div>
      <span class="scope-meta">Bộ lọc cha/con đã được áp dụng cho danh sách sản phẩm.</span>
    </div>

    <!-- Product Table -->
    <div class="table-card app-card">
      <div v-if="loading" class="table-loading">
        <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem; color: var(--primary)"></i>
      </div>

      <div v-else-if="products.length" class="table-scroll">
        <table class="product-table">
        <thead>
          <tr>
            <th class="col-product">SẢN PHẨM</th>
            <th class="col-category">DANH MỤC</th>
            <th class="col-price">GIÁ NIÊM YẾT</th>
            <th class="col-type">PHÂN LOẠI</th>
            <th class="col-material hide-mobile">CHẤT LIỆU</th>
            <th class="col-status">TRẠNG THÁI</th>
            <th class="col-actions">THAO TÁC</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="prod in products" :key="prod.id" class="table-row" @click="router.push(`/products/${prod.id}`)">
            <td class="col-product">
              <div class="product-cell">
                <img
                  v-if="prod.images?.[0]?.image_url"
                  :src="prod.images[0].image_url"
                  class="product-thumb"
                />
                <div v-else class="product-thumb-placeholder">
                  <i class="pi pi-image"></i>
                </div>
                <div class="product-info">
                  <p class="product-name">{{ prod.name }}</p>
                  <p class="product-slug">{{ prod.slug || '—' }}</p>
                </div>
              </div>
            </td>
            <td class="col-category">
              <span v-if="prod.category?.name" class="category-badge">
                {{ getCategoryBadge(getCategoryDisplay(prod)) }}
              </span>
              <span v-else class="text-muted">—</span>
            </td>
            <td class="col-price">
              <span class="price-text">{{ formatVND(prod.base_price) }}</span>
            </td>
            <td class="col-type">
              <span class="type-badge" :class="getVariantBadge(prod).cls">
                {{ getVariantBadge(prod).text }}
              </span>
            </td>
            <td class="col-material hide-mobile">
              <span class="material-text">{{ prod.material || '—' }}</span>
            </td>
            <td class="col-status" @click.stop>
              <ToggleSwitch :modelValue="prod.is_active" @update:modelValue="toggleActive(prod)" />
            </td>
            <td class="col-actions" @click.stop>
              <button class="action-btn" title="Sửa" @click="router.push(`/products/${prod.id}/edit`)">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="action-btn action-delete" title="Xóa" @click="confirmDelete(prod)">
                <i class="pi pi-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
        </table>
      </div>

      <!-- Empty -->
      <div v-else class="empty-state">
        <div class="empty-icon">
          <i class="pi pi-box"></i>
        </div>
        <h3>Chưa có sản phẩm</h3>
        <p>Chưa có dữ liệu nào được tạo.</p>
      </div>

      <!-- Pagination -->
      <div v-if="products.length" class="pagination-bar">
        <span class="pagination-info">{{ paginationInfo }}</span>
        <div class="pagination-controls">
          <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
            <i class="pi pi-chevron-left"></i>
          </button>
          <button
            v-for="p in pageNumbers"
            :key="String(p)"
            class="page-btn"
            :class="{ active: p === currentPage, dots: p === '...' }"
            :disabled="p === '...'"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
            <i class="pi pi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Cards (bottom) -->
    <div class="stats-row">
      <div class="stat-mini">
        <div class="stat-mini-left">
          <span class="stat-mini-label">TỔNG SẢN PHẨM</span>
          <span class="stat-mini-value">{{ formatNumber(totalProducts) }}</span>
        </div>
        <div class="stat-mini-icon" style="background: #FFF7ED; color: #FF6B2B">
          <i class="pi pi-check-square"></i>
        </div>
      </div>
      <div class="stat-mini">
        <div class="stat-mini-left">
          <span class="stat-mini-label">ĐANG KINH DOANH</span>
          <span class="stat-mini-value">{{ formatNumber(activeProducts) }}</span>
        </div>
        <div class="stat-mini-icon" style="background: #ECFDF5; color: #10B981">
          <i class="pi pi-check-circle"></i>
        </div>
      </div>
      <div class="stat-mini">
        <div class="stat-mini-left">
          <span class="stat-mini-label">SẮP HẾT HÀNG</span>
          <span class="stat-mini-value">{{ formatNumber(lowStockProducts) }}</span>
        </div>
        <div class="stat-mini-icon" style="background: #FEF2F2; color: #EF4444">
          <i class="pi pi-exclamation-triangle"></i>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      message="Bạn có chắc muốn xóa sản phẩm này? Hành động này không thể hoàn tác."
      severity="danger"
      confirmLabel="Xóa sản phẩm"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.product-page {
  max-width: 1400px;
}

/* ═══ Header ═══ */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
}
.page-title {
  font-size: var(--page-title-size);
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: var(--page-title-letter-spacing);
  line-height: 1.15;
}
.page-subtitle {
  font-size: var(--page-subtitle-size);
  color: var(--text-muted);
  margin-top: 4px;
  line-height: var(--page-subtitle-line-height);
}
.add-btn {
  white-space: nowrap;
  flex-shrink: 0;
}

/* ═══ Filter ═══ */
.filter-section {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.filter-left {
  flex: 1;
  min-width: 220px;
  max-width: 400px;
}
.search-wrap {
  position: relative;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #9CA3AF;
  font-size: 0.85rem;
}
.search-input {
  width: 100%;
  padding: 10px 14px 10px 38px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font-size: 0.85rem;
  font-family: inherit;
  background: #fff;
  transition: border-color 0.2s;
  outline: none;
}
.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255, 107, 43, 0.08);
}
.filter-right {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.filter-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #9CA3AF;
  text-transform: uppercase;
}
.filter-select {
  min-width: 160px;
}

.scope-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.08), rgba(255, 215, 0, 0.1));
}
.scope-overline {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-light);
}
.scope-title {
  display: block;
  margin-top: 6px;
  color: var(--text-primary);
  font-size: 0.94rem;
  font-weight: 800;
}
.scope-meta {
  color: var(--text-muted);
  font-size: 0.84rem;
  text-align: right;
}

/* ═══ Table ═══ */
.table-card {
  padding: 0;
  overflow: hidden;
}
.table-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.product-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 860px;
}
.product-table thead th {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #9CA3AF;
  text-transform: uppercase;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  white-space: nowrap;
}
.table-row {
  cursor: pointer;
  transition: background 0.15s;
}
.table-row:hover {
  background: #FEFAF7;
}
.table-row td {
  padding: 14px 16px;
  border-bottom: 1px solid #F3F4F6;
  vertical-align: middle;
}

/* Product cell */
.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.product-thumb {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid #F3F4F6;
}
.product-thumb-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #CBD5E1;
}
.product-info {
  min-width: 0;
}
.product-name {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}
.product-slug {
  font-size: 0.72rem;
  color: #9CA3AF;
  font-family: monospace;
  margin-top: 2px;
}

/* Category badge */
.category-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 700;
  background: #FFF7ED;
  color: #C2410C;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

/* Price */
.price-text {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--primary);
}

/* Type badge */
.type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 600;
  white-space: nowrap;
}
.badge-blue {
  background: #EFF6FF;
  color: #2563EB;
}
.badge-gray {
  background: #F3F4F6;
  color: #6B7280;
}

/* Material */
.material-text {
  font-size: 0.82rem;
  color: #4B5563;
}

/* Actions */
.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #9CA3AF;
  font-size: 0.85rem;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.action-btn:hover {
  background: #F3F4F6;
  color: var(--text-primary);
}
.action-delete:hover {
  background: #FEF2F2;
  color: #EF4444;
}

/* ═══ Empty ═══ */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: #F3F4F6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 1.5rem;
  color: #CBD5E1;
}
.empty-state h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}
.empty-state p {
  font-size: 0.82rem;
  color: #9CA3AF;
  margin-top: 4px;
}

/* ═══ Pagination ═══ */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid #F3F4F6;
  flex-wrap: wrap;
  gap: 12px;
}
.pagination-info {
  font-size: 0.78rem;
  color: #6B7280;
}
.pagination-controls {
  display: flex;
  gap: 4px;
}
.page-btn {
  min-width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  color: #6B7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.page-btn:hover:not(:disabled):not(.dots) {
  background: #F3F4F6;
}
.page-btn.active {
  background: var(--primary);
  color: #fff;
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.page-btn.dots {
  cursor: default;
}

/* ═══ Stats Row ═══ */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 16px;
}
.stat-mini {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-mini:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}
.stat-mini-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat-mini-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #9CA3AF;
  text-transform: uppercase;
}
.stat-mini-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-primary);
}
.stat-mini-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

/* ═══ Responsive ═══ */
@media (max-width: 1024px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .filter-section { flex-direction: column; align-items: stretch; }
  .filter-left { max-width: 100%; }
  .scope-banner { flex-direction: column; align-items: flex-start; }
  .scope-meta { text-align: left; }
}
@media (max-width: 768px) {
  .page-header { flex-direction: column; }
  .stats-row { grid-template-columns: 1fr; }
  .filter-right { flex-direction: column; width: 100%; }
  .filter-left,
  .filter-group,
  .filter-select { width: 100%; min-width: 0; }
  .product-name { max-width: 100%; }
  .col-material, .hide-mobile { display: none; }
}

@media (max-width: 640px) {
  .product-page { max-width: 100%; }
  .page-header { gap: 14px; margin-bottom: 18px; }
  .add-btn { width: 100%; justify-content: center; }
  .filter-section {
    padding: 14px;
    gap: 12px;
  }
  .filter-right { gap: 10px; }
  .scope-banner { padding: 14px; }
  .table-scroll { overflow-x: visible; }
  .product-table,
  .product-table thead,
  .product-table tbody,
  .product-table tr,
  .product-table td {
    display: block;
    width: 100%;
    min-width: 0;
  }
  .product-table thead { display: none; }
  .product-table { border-collapse: separate; }
  .product-table tbody {
    display: grid;
    gap: 12px;
    padding: 12px;
  }
  .table-row {
    border: 1px solid #F3F4F6;
    border-radius: 12px;
    background: #fff;
    overflow: hidden;
  }
  .table-row td {
    padding: 12px 14px;
    border-bottom: 1px solid #F3F4F6;
  }
  .table-row td:last-child { border-bottom: 0; }
  .col-product { padding-bottom: 14px !important; }
  .product-cell { align-items: flex-start; }
  .product-info { min-width: 0; flex: 1; }
  .product-thumb,
  .product-thumb-placeholder {
    width: 54px;
    height: 54px;
  }
  .col-category,
  .col-price,
  .col-type,
  .col-status,
  .col-actions {
    display: flex !important;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .col-category::before,
  .col-price::before,
  .col-type::before,
  .col-status::before,
  .col-actions::before {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #9CA3AF;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .col-category::before { content: "Danh mục"; }
  .col-price::before { content: "Giá"; }
  .col-type::before { content: "Loại"; }
  .col-status::before { content: "Trạng thái"; }
  .col-actions::before { content: "Thao tác"; }
  .pagination-bar {
    padding: 12px 14px;
    justify-content: center;
  }
  .pagination-info {
    width: 100%;
    text-align: center;
  }
  .pagination-controls {
    justify-content: center;
    flex-wrap: wrap;
  }
}

.text-muted { color: #9CA3AF; font-size: 0.82rem; }
</style>
