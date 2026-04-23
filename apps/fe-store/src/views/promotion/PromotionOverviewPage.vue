<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { promotionService, type Promotion, type PromotionFilter } from '@/services/promotion.service'
import { useAppToast } from '@/composables/useToast'
import { formatDate, formatNumber } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'

type PromotionLifecycle = 'ALL' | 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'INACTIVE'
type PaginationToken = number | 'ellipsis'

interface PromotionSummary {
  total: number
  active: number
  upcoming: number
  expired: number
  inactive: number
  productLinks: number
  avgDiscount: number
  hotDeals: number
}

const router = useRouter()
const toast = useAppToast()

const createSummaryDefault = (): PromotionSummary => ({
  total: 0,
  active: 0,
  upcoming: 0,
  expired: 0,
  inactive: 0,
  productLinks: 0,
  avgDiscount: 0,
  hotDeals: 0,
})

const loading = ref(true)
const promotions = ref<Promotion[]>([])
const totalRecords = ref(0)
const allPromotions = ref<Promotion[]>([])
const summary = ref<PromotionSummary>(createSummaryDefault())
const lifecycleFilter = ref<PromotionLifecycle>('ALL')
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Promotion | null>(null)
const filter = ref<PromotionFilter>({
  page: 1,
  limit: 8,
  search: '',
})

const getLifecycle = (promotion: Promotion): Exclude<PromotionLifecycle, 'ALL'> => {
  const now = Date.now()
  const start = promotion.start_date ? new Date(promotion.start_date).getTime() : null
  const end = promotion.end_date ? new Date(promotion.end_date).getTime() : null

  if (end && end < now) return 'EXPIRED'
  if (promotion.is_active && start && start > now) return 'UPCOMING'
  if (promotion.is_active) return 'ACTIVE'
  return 'INACTIVE'
}

const getLifecycleMeta = (promotion: Promotion) => {
  const lifecycle = getLifecycle(promotion)

  if (lifecycle === 'ACTIVE') {
    return { label: 'Đang chạy', helper: 'Đã áp dụng tại storefront', tone: 'status-active' }
  }

  if (lifecycle === 'UPCOMING') {
    return { label: 'Sắp chạy', helper: 'Đã lên lịch campaign', tone: 'status-upcoming' }
  }

  if (lifecycle === 'EXPIRED') {
    return { label: 'Hết hạn', helper: 'Đã vượt ngày kết thúc', tone: 'status-expired' }
  }

  return { label: 'Tạm tắt', helper: 'Đang ẩn khỏi giao diện bán hàng', tone: 'status-inactive' }
}

const tabs = computed(() => [
  { label: 'Tất cả', value: 'ALL' as PromotionLifecycle, count: summary.value.total },
  { label: 'Đang chạy', value: 'ACTIVE' as PromotionLifecycle, count: summary.value.active },
  { label: 'Sắp chạy', value: 'UPCOMING' as PromotionLifecycle, count: summary.value.upcoming },
  { label: 'Hết hạn', value: 'EXPIRED' as PromotionLifecycle, count: summary.value.expired },
  { label: 'Tạm tắt', value: 'INACTIVE' as PromotionLifecycle, count: summary.value.inactive },
])

const statCards = computed(() => [
  {
    label: 'Campaign đang chạy',
    value: formatNumber(summary.value.active),
    note: `${formatNumber(summary.value.upcoming)} campaign đã lên lịch`,
    tone: 'neutral',
  },
  {
    label: 'Sản phẩm áp dụng',
    value: formatNumber(summary.value.productLinks),
    note: 'Tổng số liên kết sản phẩm trong toàn bộ campaign',
    tone: 'neutral',
  },
  {
    label: 'Giảm giá trung bình',
    value: `${summary.value.avgDiscount.toFixed(1)}%`,
    note: summary.value.hotDeals > 0
      ? `${formatNumber(summary.value.hotDeals)} sản phẩm đang ở mức deal hot`
      : 'Chưa có sản phẩm nào trên ngưỡng deal hot',
    tone: 'neutral',
  },
  {
    label: 'Campaign đã đóng',
    value: formatNumber(summary.value.expired),
    note: summary.value.expired > 0 ? 'Nên rà lại campaign cũ để tái sử dụng' : 'Chưa có campaign nào kết thúc',
    tone: 'highlight',
  },
])

const totalPages = computed(() => {
  const limit = Number(filter.value.limit || 1)
  return Math.max(1, Math.ceil(totalRecords.value / limit))
})

const pageSummary = computed(() => {
  if (!promotions.value.length) {
    return `Hiển thị 0 - 0 trên tổng ${formatNumber(totalRecords.value)} khuyến mãi`
  }

  const page = Number(filter.value.page || 1)
  const limit = Number(filter.value.limit || promotions.value.length)
  const start = (page - 1) * limit + 1
  const end = start + promotions.value.length - 1

  return `Hiển thị ${formatNumber(start)} - ${formatNumber(end)} trên tổng ${formatNumber(totalRecords.value)} khuyến mãi`
})

const paginationItems = computed<PaginationToken[]>(() => {
  const total = totalPages.value
  const current = Number(filter.value.page || 1)

  if (total <= 1) return [1]

  const candidates = new Set<number>([1, total, current - 1, current, current + 1])
  const pages = [...candidates].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)
  const items: PaginationToken[] = []

  pages.forEach((page, index) => {
    const previous = pages[index - 1] ?? page
    if (index > 0 && page - previous > 1) items.push('ellipsis')
    items.push(page)
  })

  return items
})

const heroTip = computed(() => {
  if (summary.value.active === 0) {
    return 'Shop chưa có campaign nào đang chạy. Tạo một đợt giảm cho nhóm sản phẩm chủ lực sẽ giúp trang bán hàng bớt trống.'
  }

  if (summary.value.hotDeals > 0) {
    return `${formatNumber(summary.value.hotDeals)} sản phẩm đang nằm trong vùng giảm sâu. Nên kiểm tra lại tồn kho và biên lợi nhuận trước khi đẩy truyền thông.`
  }

  return 'Giữ tỷ lệ giảm trung bình trong vùng 10% đến 25% thường giúp campaign trông hấp dẫn mà vẫn an toàn về lợi nhuận.'
})

const fetchPromotionSummarySource = async () => {
  const pageSize = 100
  let page = 1
  let totalPages = 1
  const items: Promotion[] = []

  do {
    const { data } = await promotionService.getAll({ page, limit: pageSize })
    const payload = data.data || {}
    const chunk = payload.data || payload.items || payload || []
    items.push(...chunk)
    totalPages = Number(payload.meta?.total_pages ?? payload.meta?.totalPages ?? 1)
    page += 1
  } while (page <= totalPages)

  return items
}

const fetchSummary = async () => {
  const items = await fetchPromotionSummarySource()
  allPromotions.value = items

  const aggregate = items.reduce(
    (acc: PromotionSummary, promotion: Promotion) => {
      const lifecycle = getLifecycle(promotion)
      const details = promotion.details || []
      const productLinks = details.length
      const hotDeals = details.filter((detail) => Number(detail.discount_percent || 0) >= 30).length
      const discountTotal = details.reduce((sum, detail) => sum + Number(detail.discount_percent || 0), 0)

      acc.total += 1
      acc.productLinks += productLinks
      acc.hotDeals += hotDeals
      acc.avgDiscount += discountTotal

      if (lifecycle === 'ACTIVE') acc.active += 1
      if (lifecycle === 'UPCOMING') acc.upcoming += 1
      if (lifecycle === 'EXPIRED') acc.expired += 1
      if (lifecycle === 'INACTIVE') acc.inactive += 1

      return acc
    },
    createSummaryDefault(),
  )

  summary.value = {
    ...aggregate,
    avgDiscount: aggregate.productLinks > 0 ? Number((aggregate.avgDiscount / aggregate.productLinks).toFixed(1)) : 0,
  }
}

const fetchPromotions = async () => {
  loading.value = true
  try {
    const params: PromotionFilter = {
      ...filter.value,
      is_active:
        lifecycleFilter.value === 'ACTIVE'
          ? 'true'
          : lifecycleFilter.value === 'INACTIVE'
            ? 'false'
            : undefined,
    }

    const { data } = await promotionService.getAll(params)
    let items = data.data?.data || data.data?.items || data.data || []

    if (lifecycleFilter.value === 'UPCOMING' || lifecycleFilter.value === 'EXPIRED') {
      items = items.filter((promotion: Promotion) => getLifecycle(promotion) === lifecycleFilter.value)
    }

    promotions.value = items
    totalRecords.value = Number(data.data?.meta?.total ?? data.data?.total ?? items.length)
  } catch {
    toast.error('Không thể tải danh sách khuyến mãi')
  } finally {
    loading.value = false
  }
}

const fetchAll = async () => {
  try {
    await Promise.all([fetchSummary(), fetchPromotions()])
  } catch {
    toast.error('Không thể tải tổng quan khuyến mãi')
  }
}

const applySearch = () => {
  filter.value.page = 1
  fetchPromotions()
}

const refreshAll = () => {
  fetchAll()
}

const openCreate = () => {
  router.push('/promotions/new')
}

const openEdit = (promotionId: string) => {
  router.push(`/promotions/${promotionId}/edit`)
}

const toggleActive = async (promotion: Promotion) => {
  try {
    await promotionService.toggleActive(promotion.id, !promotion.is_active)
    toast.success(promotion.is_active ? 'Đã tắt khuyến mãi' : 'Đã kích hoạt khuyến mãi')
    await fetchAll()
  } catch {
    toast.error('Cập nhật trạng thái khuyến mãi thất bại')
  }
}

const confirmDelete = (promotion: Promotion) => {
  deleteTarget.value = promotion
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return

  try {
    await promotionService.delete(deleteTarget.value.id)
    toast.success('Đã xóa khuyến mãi')
    await fetchAll()
  } catch {
    toast.error('Xóa khuyến mãi thất bại')
  }
}

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === filter.value.page) return
  filter.value.page = page
  fetchPromotions()
}

watch(lifecycleFilter, () => {
  filter.value.page = 1
  fetchPromotions()
})

onMounted(fetchAll)
</script>

<template>
  <div class="promotion-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">Quản lý khuyến mãi</h1>
        <p class="page-subtitle">
          Theo dõi campaign đang chạy, nhóm sản phẩm áp dụng và nhịp giảm giá của shop trong một màn hình rõ ràng hơn.
        </p>
      </div>

      <Button
        label="Tạo khuyến mãi"
        icon="pi pi-plus"
        class="btn-create-unified"
        @click="openCreate"
      />
    </section>

    <section class="stats-grid">
      <article
        v-for="card in statCards"
        :key="card.label"
        class="stat-card"
        :class="{ highlight: card.tone === 'highlight' }"
      >
        <p class="stat-label">{{ card.label }}</p>
        <strong class="stat-value">{{ card.value }}</strong>
        <p class="stat-note">{{ card.note }}</p>
      </article>
    </section>

    <section class="promotion-shell">
      <div class="toolbar-top">
        <div class="search-wrap">
          <i class="pi pi-search search-icon"></i>
          <InputText
            v-model="filter.search"
            class="promotion-search"
            placeholder="Tìm campaign theo tên..."
            @keyup.enter="applySearch"
          />
        </div>

        <div class="toolbar-actions">
          <button type="button" class="icon-action" aria-label="Làm mới" @click="refreshAll">
            <i class="pi pi-refresh"></i>
          </button>
        </div>
      </div>

      <div class="tabs-wrap">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="tab-btn"
          :class="{ active: lifecycleFilter === tab.value }"
          @click="lifecycleFilter = tab.value"
        >
          <span>{{ tab.label }}</span>
          <span class="tab-count">{{ formatNumber(tab.count) }}</span>
        </button>
      </div>

      <div class="table-card">
        <div class="table-head">
          <div>Tên campaign</div>
          <div>Thời gian</div>
          <div>Sản phẩm</div>
          <div>Giảm TB</div>
          <div>Trạng thái</div>
          <div class="text-right">Thao tác</div>
        </div>

        <div v-if="loading" class="table-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <div v-else-if="!promotions.length" class="empty-wrap">
          <EmptyState
            icon="pi pi-megaphone"
            title="Chưa có khuyến mãi"
            description="Tạo campaign mới để đẩy giảm giá theo từng nhóm sản phẩm hoặc mùa bán hàng."
          >
            <div class="empty-actions">
              <Button label="Tạo campaign đầu tiên" icon="pi pi-plus" class="btn-create-unified" @click="openCreate" />
            </div>
          </EmptyState>
        </div>

        <template v-else>
          <div
            v-for="promotion in promotions"
            :key="promotion.id"
            class="promotion-row"
          >
            <div class="name-cell">
              <span class="mobile-label">Tên campaign</span>
              <strong>{{ promotion.name }}</strong>
              <span>{{ promotion.description || 'Campaign giảm giá theo sản phẩm' }}</span>
            </div>

            <div class="time-cell">
              <span class="mobile-label">Thời gian</span>
              <strong>{{ promotion.start_date ? formatDate(promotion.start_date) : 'Mở ngay' }}</strong>
              <span>{{ promotion.end_date ? `Đến ${formatDate(promotion.end_date)}` : 'Không giới hạn ngày kết thúc' }}</span>
            </div>

            <div class="products-cell">
              <span class="mobile-label">Sản phẩm</span>
              <strong>{{ formatNumber(promotion.details.length) }} sản phẩm</strong>
              <span>{{ promotion.details.length ? 'Đã gắn trực tiếp vào campaign' : 'Chưa có sản phẩm áp dụng' }}</span>
            </div>

            <div class="discount-cell">
              <span class="mobile-label">Giảm TB</span>
              <strong>
                {{
                  promotion.details.length
                    ? `${(
                      promotion.details.reduce((sum, detail) => sum + Number(detail.discount_percent || 0), 0)
                      / promotion.details.length
                    ).toFixed(1)}%`
                    : '0%'
                }}
              </strong>
              <span>
                {{
                  promotion.details.some((detail) => Number(detail.discount_percent || 0) >= 30)
                    ? 'Có sản phẩm trong vùng deal hot'
                    : 'Mức giảm đang an toàn'
                }}
              </span>
            </div>

            <div class="status-cell">
              <span class="mobile-label">Trạng thái</span>
              <div class="status-stack">
                <span class="status-pill" :class="getLifecycleMeta(promotion).tone">{{ getLifecycleMeta(promotion).label }}</span>
                <span class="status-helper">{{ getLifecycleMeta(promotion).helper }}</span>
              </div>
              <ToggleSwitch :modelValue="promotion.is_active" @update:modelValue="toggleActive(promotion)" />
            </div>

            <div class="actions-cell">
              <button type="button" class="row-action" @click="openEdit(promotion.id)">Sửa</button>
              <button type="button" class="row-action danger" @click="confirmDelete(promotion)">Xóa</button>
            </div>
          </div>
        </template>
      </div>

      <div class="table-footer">
        <p class="footer-copy">{{ pageSummary }}</p>

        <div v-if="totalPages > 1" class="pagination-wrap">
          <button class="page-nav" :disabled="filter.page === 1" @click="goToPage(Number(filter.page) - 1)">
            <i class="pi pi-angle-left"></i>
          </button>

          <button
            v-for="item in paginationItems"
            :key="`${item}-${filter.page}`"
            class="page-btn"
            :class="{ active: item === filter.page, ghost: item === 'ellipsis' }"
            :disabled="item === 'ellipsis'"
            @click="typeof item === 'number' && goToPage(item)"
          >
            {{ item === 'ellipsis' ? '…' : item }}
          </button>

          <button class="page-nav" :disabled="filter.page === totalPages" @click="goToPage(Number(filter.page) + 1)">
            <i class="pi pi-angle-right"></i>
          </button>
        </div>
      </div>
    </section>

    <section class="tip-card">
      <div class="tip-icon">
        <i class="pi pi-lightbulb"></i>
      </div>
      <div class="tip-copy">
        <strong>Gợi ý điều phối campaign</strong>
        <p>{{ heroTip }}</p>
      </div>
    </section>

    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      message="Xóa khuyến mãi này khỏi hệ thống?"
      severity="danger"
      confirmLabel="Xóa"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.promotion-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.promotion-shell {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 249, 245, 0.92));
  border: 1px solid #edf2f7;
  border-radius: 28px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.04);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.stat-card {
  min-height: 156px;
  padding: 24px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.9));
  border: 1px solid #edf2f7;
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.04);
}

.stat-card.highlight {
  background: linear-gradient(135deg, #ff8a32 0%, #ffc727 100%);
  border-color: rgba(255, 165, 0, 0.24);
  color: #fff;
}

.stat-label {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a6f63;
}

.stat-card.highlight .stat-label,
.stat-card.highlight .stat-note {
  color: rgba(255, 255, 255, 0.88);
}

.stat-value {
  display: block;
  margin-top: 16px;
  font-size: clamp(2rem, 4vw, 2.6rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 1;
  color: #0f172a;
}

.stat-card.highlight .stat-value {
  color: #fff;
}

.stat-note {
  margin-top: 14px;
  color: #64748b;
  line-height: 1.65;
}

.promotion-shell {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toolbar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.search-wrap {
  position: relative;
  flex: 1;
  max-width: 520px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}

.promotion-search {
  width: 100%;
  height: 52px;
  padding-left: 44px;
  border-radius: 18px;
  border-color: #e2e8f0;
  background: #f8fbff;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-action {
  width: 46px;
  height: 46px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.tabs-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tab-btn {
  border: 1px solid #edf2f7;
  background: #fff;
  color: #475569;
  border-radius: 14px;
  padding: 10px 14px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.12), rgba(255, 207, 84, 0.16));
  color: #c2410c;
  border-color: rgba(255, 107, 43, 0.18);
}

.tab-count {
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.76rem;
}

.table-card {
  border-radius: 26px;
  background: #fff;
  border: 1px solid #edf2f7;
  overflow: hidden;
}

.table-head,
.promotion-row {
  display: grid;
  grid-template-columns: 1.8fr 1.2fr 1fr 1fr 1.45fr 0.9fr;
  gap: 18px;
}

.table-head {
  padding: 18px 24px;
  background: #f8fbff;
  border-bottom: 1px solid #edf2f7;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #94a3b8;
}

.promotion-row {
  padding: 24px;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
}

.promotion-row:last-child {
  border-bottom: none;
}

.table-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: var(--primary);
  font-size: 1.4rem;
}

.empty-wrap {
  padding: 32px 24px;
}

.empty-actions {
  margin-top: 14px;
}

.mobile-label {
  display: none;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #94a3b8;
}

.name-cell,
.time-cell,
.products-cell,
.discount-cell,
.status-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.name-cell strong,
.time-cell strong,
.products-cell strong,
.discount-cell strong {
  color: #0f172a;
  font-size: 0.98rem;
}

.name-cell span,
.time-cell span,
.products-cell span,
.discount-cell span,
.status-helper {
  color: #64748b;
  line-height: 1.55;
}

.status-cell {
  gap: 12px;
}

.status-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
}

.status-active {
  background: #dcfce7;
  color: #15803d;
}

.status-upcoming {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-expired {
  background: #fee2e2;
  color: #dc2626;
}

.status-inactive {
  background: #e2e8f0;
  color: #475569;
}

.actions-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.row-action {
  border: none;
  background: transparent;
  color: #111827;
  font-weight: 700;
  transition: color 0.2s ease;
}

.row-action:hover {
  color: var(--primary);
}

.row-action.danger:hover {
  color: #dc2626;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.footer-copy {
  color: #64748b;
}

.pagination-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-nav,
.page-btn {
  width: 42px;
  height: 42px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  transition: all 0.2s ease;
}

.page-btn.active {
  border-color: transparent;
  background: linear-gradient(135deg, #ff7a31, #ffb11f);
  color: #fff;
}

.page-btn.ghost {
  cursor: default;
}

.tip-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 24px;
  border-radius: 26px;
  border: 1px solid #edf2f7;
  background: linear-gradient(180deg, rgba(255, 246, 210, 0.94), rgba(255, 253, 244, 0.98));
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
}

.tip-icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.tip-copy strong {
  display: block;
  font-size: 1rem;
  color: #0f172a;
}

.tip-copy p {
  margin-top: 8px;
  color: #475569;
  line-height: 1.75;
}

.text-right {
  text-align: right;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .table-head {
    display: none;
  }

  .promotion-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px 20px;
  }

  .mobile-label {
    display: inline-flex;
  }

  .actions-cell {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    padding-top: 4px;
  }
}

@media (max-width: 900px) {
  .toolbar-top,
  .table-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .search-wrap {
    width: 100%;
    max-width: none;
  }
}

@media (max-width: 720px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .promotion-row {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .promotion-shell {
    padding: 20px;
  }

  .pagination-wrap {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}

@media (max-width: 560px) {
  .promotion-page {
    gap: 18px;
  }

  .promotion-shell,
  .tip-card,
  .stat-card {
    border-radius: 22px;
  }

}
</style>
