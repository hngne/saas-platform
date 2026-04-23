<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { voucherService, type Voucher, type VoucherFilter, type VoucherSummary } from '@/services/voucher.service'
import { useAppToast } from '@/composables/useToast'
import { formatDate, formatNumber, formatVND } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import VoucherEditorDrawer from '@/components/voucher/VoucherEditorDrawer.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'

type VoucherLifecycle = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'UPCOMING' | 'INACTIVE'
type VoucherTypeFilter = 'ALL' | 'FIXED' | 'PERCENT'
type PaginationToken = number | 'ellipsis'

const authStore = useAuthStore()
const toast = useAppToast()

const createSummaryDefault = (): VoucherSummary => ({
  total_vouchers: 0,
  active_vouchers: 0,
  expired_vouchers: 0,
  upcoming_vouchers: 0,
  inactive_vouchers: 0,
  fixed_vouchers: 0,
  percent_vouchers: 0,
  redeemed_vouchers: 0,
  total_redemptions: 0,
  discount_budget: 0,
  expiring_soon: 0,
  capacity_total: 0,
  capacity_used: 0,
  conversion_rate: 0,
})

const loading = ref(true)
const vouchers = ref<Voucher[]>([])
const totalRecords = ref(0)
const summary = ref<VoucherSummary>(createSummaryDefault())
const lifecycleFilter = ref<VoucherLifecycle>('ALL')
const typeFilter = ref<VoucherTypeFilter>('ALL')
const showDrawer = ref(false)
const editItem = ref<Voucher | null>(null)
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Voucher | null>(null)
const filter = ref<VoucherFilter>({
  page: 1,
  limit: 6,
  search: '',
  sort_order: 'desc',
})

const statusTabs = computed(() => [
  { label: 'Tất cả', value: 'ALL' as VoucherLifecycle, count: summary.value.total_vouchers },
  { label: 'Đang chạy', value: 'ACTIVE' as VoucherLifecycle, count: summary.value.active_vouchers },
  { label: 'Sắp chạy', value: 'UPCOMING' as VoucherLifecycle, count: summary.value.upcoming_vouchers },
  { label: 'Hết hạn', value: 'EXPIRED' as VoucherLifecycle, count: summary.value.expired_vouchers },
  { label: 'Tạm tắt', value: 'INACTIVE' as VoucherLifecycle, count: summary.value.inactive_vouchers },
])

const typeTabs = computed(() => [
  { label: 'Tất cả loại', value: 'ALL' as VoucherTypeFilter, count: summary.value.total_vouchers },
  { label: 'Giảm tiền', value: 'FIXED' as VoucherTypeFilter, count: summary.value.fixed_vouchers },
  { label: 'Giảm %', value: 'PERCENT' as VoucherTypeFilter, count: summary.value.percent_vouchers },
])

const statCards = computed(() => [
  {
    label: 'Voucher đang chạy',
    value: formatNumber(summary.value.active_vouchers),
    note: `${formatNumber(summary.value.upcoming_vouchers)} voucher sắp lên lịch`,
    tone: 'neutral',
  },
  {
    label: 'Lượt sử dụng',
    value: formatNumber(summary.value.total_redemptions),
    note: `${formatNumber(summary.value.redeemed_vouchers)} voucher đã phát sinh đơn`,
    tone: 'neutral',
  },
  {
    label: 'Ngân sách giảm giá',
    value: formatVND(summary.value.discount_budget),
    note:
      summary.value.expiring_soon > 0
        ? `${formatNumber(summary.value.expiring_soon)} voucher sắp hết hạn trong 48 giờ`
        : 'Chưa có voucher nào sắp hết hạn',
    tone: 'neutral',
  },
  {
    label: 'Tỷ lệ khai thác',
    value: `${summary.value.conversion_rate.toFixed(1)}%`,
    note:
      summary.value.capacity_total > 0
        ? `${formatNumber(summary.value.capacity_used)} / ${formatNumber(summary.value.capacity_total)} lượt đã dùng`
        : 'Đang tính theo số voucher đã được sử dụng',
    tone: 'highlight',
  },
])

const totalPages = computed(() => {
  const limit = Number(filter.value.limit || 1)
  return Math.max(1, Math.ceil(totalRecords.value / limit))
})

const pageSummary = computed(() => {
  if (!vouchers.value.length) {
    return `Hiển thị 0 - 0 trên tổng ${formatNumber(totalRecords.value)} voucher`
  }

  const page = Number(filter.value.page || 1)
  const limit = Number(filter.value.limit || vouchers.value.length)
  const start = (page - 1) * limit + 1
  const end = start + vouchers.value.length - 1

  return `Hiển thị ${formatNumber(start)} - ${formatNumber(end)} trên tổng ${formatNumber(totalRecords.value)} voucher`
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

const storeName = computed(() => authStore.tenant?.store_name || 'shop hiện tại')

const getVoucherLifecycle = (voucher: Voucher): Exclude<VoucherLifecycle, 'ALL'> => {
  const now = Date.now()
  const start = voucher.start_date ? new Date(voucher.start_date).getTime() : null
  const end = voucher.end_date ? new Date(voucher.end_date).getTime() : null

  if (end && end < now) return 'EXPIRED'
  if (voucher.is_active && start && start > now) return 'UPCOMING'
  if (voucher.is_active) return 'ACTIVE'
  return 'INACTIVE'
}

const getLifecycleMeta = (voucher: Voucher) => {
  const lifecycle = getVoucherLifecycle(voucher)

  if (lifecycle === 'ACTIVE') {
    return { label: 'Đang chạy', helper: 'Khách có thể dùng ngay', tone: 'status-active' }
  }

  if (lifecycle === 'UPCOMING') {
    return { label: 'Sắp chạy', helper: 'Đã lên lịch kích hoạt', tone: 'status-upcoming' }
  }

  if (lifecycle === 'EXPIRED') {
    return { label: 'Hết hạn', helper: 'Đã vượt ngày kết thúc', tone: 'status-expired' }
  }

  return { label: 'Tạm tắt', helper: 'Đang ẩn khỏi checkout', tone: 'status-inactive' }
}

const getTypeMeta = (voucher: Voucher) => {
  if (voucher.discount_type === 'PERCENT') {
    return { label: 'Phần trăm', tone: 'type-percent' }
  }

  return { label: 'Giảm tiền', tone: 'type-fixed' }
}

const formatVoucherValue = (voucher: Voucher) =>
  voucher.discount_type === 'PERCENT'
    ? `${formatNumber(voucher.discount_value)}%`
    : formatVND(voucher.discount_value)

const formatMinOrder = (voucher: Voucher) =>
  voucher.min_order_value ? formatVND(voucher.min_order_value) : 'Không yêu cầu'

const formatExpiry = (voucher: Voucher) => {
  if (!voucher.end_date) return 'Không hết hạn'
  return formatDate(voucher.end_date)
}

const getUsagePercent = (voucher: Voucher) => {
  if (!voucher.usage_limit || voucher.usage_limit <= 0) return null
  return Math.max(0, Math.min(100, Math.round((voucher.used_count / voucher.usage_limit) * 100)))
}

const formatUsage = (voucher: Voucher) => {
  if (!voucher.usage_limit || voucher.usage_limit <= 0) {
    return `${formatNumber(voucher.used_count)} lượt`
  }

  return `${formatNumber(voucher.used_count)} / ${formatNumber(voucher.usage_limit)}`
}

const formatUsageHint = (voucher: Voucher) => {
  const percent = getUsagePercent(voucher)
  if (percent === null) return 'Không giới hạn lượt dùng'
  return `${percent}% công suất`
}

const campaignHeadline = computed(() => {
  if (summary.value.active_vouchers === 0) {
    return 'Kích hoạt một voucher đầu tiên để kéo tỷ lệ chốt đơn'
  }

  if (summary.value.expiring_soon > 0) {
    return 'Một số voucher sắp hết hạn, nên chuẩn bị chiến dịch kế tiếp'
  }

  if (summary.value.percent_vouchers > summary.value.fixed_vouchers) {
    return 'Cân thêm voucher giảm tiền để đa dạng lựa chọn ở checkout'
  }

  return 'Hệ thống voucher đang cân bằng, có thể mở thêm chiến dịch theo mùa'
})

const campaignDescription = computed(() => {
  if (summary.value.active_vouchers === 0) {
    return 'Khởi động bằng voucher chào mừng hoặc freeship sẽ dễ kích hoạt chuyển đổi hơn khi shop chưa có campaign chạy.'
  }

  if (summary.value.expiring_soon > 0) {
    return `Hiện có ${formatNumber(summary.value.expiring_soon)} voucher sắp hết hạn trong 48 giờ. Tạo trước campaign kế nhiệm sẽ tránh trống khoảng ưu đãi.`
  }

  return `Shop ${storeName.value} hiện có ${formatNumber(summary.value.total_vouchers)} voucher, trong đó ${formatNumber(summary.value.active_vouchers)} voucher đang hoạt động.`
})

const insightCards = computed(() => [
  {
    title: 'Gợi ý thông minh',
    copy:
      summary.value.fixed_vouchers === 0 && summary.value.percent_vouchers > 0
        ? 'Shop đang thiên về voucher giảm %. Nên bổ sung thêm voucher giảm tiền cố định cho đơn hàng giá thấp.'
        : 'Giữ ít nhất một voucher giảm tiền và một voucher giảm % sẽ giúp khách có cảm giác nhiều lựa chọn hơn.',
    tone: 'accent',
    icon: 'pi pi-sparkles',
  },
  {
    title: 'Lịch hết hạn',
    copy:
      summary.value.expiring_soon > 0
        ? `${formatNumber(summary.value.expiring_soon)} voucher sẽ hết hạn trong 48 giờ tới.`
        : 'Hiện chưa có voucher nào sắp hết hạn ngay.',
    tone: 'sky',
    icon: 'pi pi-clock',
  },
  {
    title: 'Mức sử dụng',
    copy:
      summary.value.capacity_total > 0
        ? `Đã dùng ${formatNumber(summary.value.capacity_used)} trên ${formatNumber(summary.value.capacity_total)} lượt cấu hình.`
        : 'Phần lớn voucher chưa giới hạn usage, nên cần theo dõi doanh thu thay vì capacity.',
    tone: 'slate',
    icon: 'pi pi-chart-line',
  },
])

const fetchSummary = async () => {
  const { data } = await voucherService.getSummary()
  summary.value = data.data
}

const fetchVouchers = async () => {
  loading.value = true
  try {
    const params: VoucherFilter = {
      ...filter.value,
      status: lifecycleFilter.value === 'ALL' ? undefined : lifecycleFilter.value,
      discount_type: typeFilter.value === 'ALL' ? undefined : typeFilter.value,
    }
    const { data } = await voucherService.getAll(params)
    const result = data.data
    vouchers.value = result.data || result.items || result || []
    totalRecords.value = Number(result.meta?.total ?? result.total ?? vouchers.value.length)
  } catch {
    toast.error('Không thể tải danh sách voucher')
  } finally {
    loading.value = false
  }
}

const fetchAll = async () => {
  try {
    await Promise.all([fetchSummary(), fetchVouchers()])
  } catch {
    toast.error('Không thể tải tổng quan voucher')
  }
}

const applySearch = () => {
  filter.value.page = 1
  fetchVouchers()
}

const refreshAll = () => {
  fetchAll()
}

const openCreate = () => {
  editItem.value = null
  showDrawer.value = true
}

const openEdit = (voucher: Voucher) => {
  editItem.value = { ...voucher }
  showDrawer.value = true
}

const toggleActive = async (voucher: Voucher) => {
  try {
    await voucherService.toggleActive(voucher.id, !voucher.is_active)
    toast.success(voucher.is_active ? 'Đã tắt voucher' : 'Đã kích hoạt voucher')
    await fetchAll()
  } catch {
    toast.error('Cập nhật trạng thái voucher thất bại')
  }
}

const confirmDelete = (voucher: Voucher) => {
  deleteTarget.value = voucher
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return

  try {
    await voucherService.delete(deleteTarget.value.id)
    toast.success('Đã xóa voucher')
    await fetchAll()
  } catch {
    toast.error('Xóa voucher thất bại')
  }
}

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === filter.value.page) return
  filter.value.page = page
  fetchVouchers()
}

const escapeCsvCell = (value: string | number | null | undefined) => {
  const normalized = value == null ? '' : String(value)
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

const exportCsv = () => {
  const rows = vouchers.value.map((voucher) => [
    voucher.code,
    voucher.name || '',
    getTypeMeta(voucher).label,
    formatVoucherValue(voucher),
    formatMinOrder(voucher),
    formatUsage(voucher),
    formatExpiry(voucher),
    getLifecycleMeta(voucher).label,
  ])

  const csv = [
    ['Ma voucher', 'Ten noi bo', 'Loai', 'Gia tri', 'Don toi thieu', 'Luot dung', 'Het han', 'Trang thai'],
    ...rows,
  ]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n')

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'voucher-export.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success('Đã xuất CSV cho danh sách hiện tại')
}

watch([lifecycleFilter, typeFilter], () => {
  filter.value.page = 1
  fetchVouchers()
})

onMounted(fetchAll)
</script>

<template>
  <div class="voucher-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">Quản lý voucher</h1>
        <p class="page-subtitle">
          Thiết kế, theo dõi và vận hành các mã giảm giá cho <strong>{{ storeName }}</strong>.
          Màn này gom cả voucher đang chạy, sắp chạy và đã hết hạn để đội vận hành kiểm soát trong một nơi.
        </p>
      </div>

      <Button
        label="Thêm voucher"
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

    <section class="voucher-shell">
      <div class="toolbar-top">
        <div class="search-wrap">
          <i class="pi pi-search search-icon"></i>
          <InputText
            v-model="filter.search"
            class="voucher-search"
            placeholder="Tìm voucher, mã code hoặc tên chiến dịch..."
            @keyup.enter="applySearch"
          />
        </div>

        <div class="toolbar-actions">
          <button type="button" class="icon-action" aria-label="Làm mới" @click="refreshAll">
            <i class="pi pi-refresh"></i>
          </button>
          <button type="button" class="icon-action" aria-label="Xuất CSV" @click="exportCsv">
            <i class="pi pi-download"></i>
          </button>
        </div>
      </div>

      <div class="filters-wrap">
        <div class="filter-cluster">
          <span class="cluster-label">Trạng thái</span>
          <div class="filter-pills">
            <button
              v-for="tab in statusTabs"
              :key="tab.value"
              type="button"
              class="filter-pill"
              :class="{ active: lifecycleFilter === tab.value }"
              @click="lifecycleFilter = tab.value"
            >
              <span>{{ tab.label }}</span>
              <span class="pill-count">{{ formatNumber(tab.count) }}</span>
            </button>
          </div>
        </div>

        <div class="filter-divider"></div>

        <div class="filter-cluster">
          <span class="cluster-label">Kiểu giảm</span>
          <div class="filter-pills compact">
            <button
              v-for="tab in typeTabs"
              :key="tab.value"
              type="button"
              class="filter-pill"
              :class="{ active: typeFilter === tab.value }"
              @click="typeFilter = tab.value"
            >
              <span>{{ tab.label }}</span>
              <span class="pill-count">{{ formatNumber(tab.count) }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="table-card">
        <div class="table-head">
          <div>Mã</div>
          <div>Tên voucher</div>
          <div>Loại</div>
          <div>Giá trị</div>
          <div>Đơn tối thiểu</div>
          <div>Lượt dùng</div>
          <div>Hết hạn</div>
          <div>Trạng thái</div>
          <div class="text-right">Thao tác</div>
        </div>

        <div v-if="loading" class="table-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <div v-else-if="!vouchers.length" class="empty-wrap">
          <EmptyState
            icon="pi pi-ticket"
            title="Chưa có voucher phù hợp"
            description="Khi có mã ưu đãi hoặc campaign mới, danh sách sẽ hiển thị theo layout này ngay."
          >
            <div class="empty-actions">
              <Button
                label="Tạo voucher đầu tiên"
                icon="pi pi-plus"
                class="btn-create-unified"
                @click="openCreate"
              />
            </div>
          </EmptyState>
        </div>

        <template v-else>
          <div
            v-for="voucher in vouchers"
            :key="voucher.id"
            class="voucher-row"
          >
            <div class="code-cell">
              <span class="mobile-label">Mã</span>
              <span class="code-pill">{{ voucher.code }}</span>
            </div>

            <div class="name-cell">
              <span class="mobile-label">Tên voucher</span>
              <strong>{{ voucher.name || 'Voucher không đặt tên' }}</strong>
              <span>{{ voucher.discount_type === 'PERCENT' ? 'Chiến dịch giảm theo phần trăm' : 'Chiến dịch giảm tiền trực tiếp' }}</span>
            </div>

            <div class="type-cell">
              <span class="mobile-label">Loại</span>
              <span class="type-pill" :class="getTypeMeta(voucher).tone">{{ getTypeMeta(voucher).label }}</span>
            </div>

            <div class="value-cell">
              <span class="mobile-label">Giá trị</span>
              <strong>{{ formatVoucherValue(voucher) }}</strong>
              <span v-if="voucher.discount_type === 'PERCENT' && voucher.max_discount">
                Tối đa {{ formatVND(voucher.max_discount) }}
              </span>
            </div>

            <div class="min-order-cell">
              <span class="mobile-label">Đơn tối thiểu</span>
              <strong>{{ formatMinOrder(voucher) }}</strong>
            </div>

            <div class="usage-cell">
              <span class="mobile-label">Lượt dùng</span>
              <div class="usage-copy">
                <strong>{{ formatUsage(voucher) }}</strong>
                <span>{{ formatUsageHint(voucher) }}</span>
              </div>
              <div v-if="getUsagePercent(voucher) !== null" class="usage-bar">
                <span class="usage-fill" :style="{ width: `${getUsagePercent(voucher)}%` }"></span>
              </div>
            </div>

            <div class="expiry-cell">
              <span class="mobile-label">Hết hạn</span>
              <strong>{{ formatExpiry(voucher) }}</strong>
              <span>{{ voucher.start_date ? `Bắt đầu ${formatDate(voucher.start_date)}` : 'Kích hoạt ngay khi bật' }}</span>
            </div>

            <div class="status-cell">
              <span class="mobile-label">Trạng thái</span>
              <div class="status-stack">
                <span class="status-pill" :class="getLifecycleMeta(voucher).tone">{{ getLifecycleMeta(voucher).label }}</span>
                <span class="status-helper">{{ getLifecycleMeta(voucher).helper }}</span>
              </div>
              <ToggleSwitch :modelValue="voucher.is_active" @update:modelValue="toggleActive(voucher)" />
            </div>

            <div class="actions-cell">
              <button type="button" class="row-action" @click="openEdit(voucher)">Sửa</button>
              <button type="button" class="row-action danger" @click="confirmDelete(voucher)">Xóa</button>
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

    <section class="insights-grid">
      <article class="campaign-card">
        <span class="campaign-kicker">Hot offer</span>
        <h2>{{ campaignHeadline }}</h2>
        <p>{{ campaignDescription }}</p>
        <Button label="Tạo chiến dịch" class="campaign-btn" @click="openCreate" />
      </article>

      <div class="insight-stack">
        <article
          v-for="card in insightCards"
          :key="card.title"
          class="insight-card"
          :class="card.tone"
        >
          <div class="insight-icon">
            <i :class="card.icon"></i>
          </div>
          <div class="insight-copy">
            <strong>{{ card.title }}</strong>
            <p>{{ card.copy }}</p>
          </div>
        </article>
      </div>
    </section>

    <VoucherEditorDrawer
      v-model:visible="showDrawer"
      :voucher="editItem"
      @saved="showDrawer = false; fetchAll()"
    />
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      message="Xóa voucher này khỏi hệ thống?"
      severity="danger"
      confirmLabel="Xóa"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.voucher-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.voucher-shell {
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

.voucher-shell {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 22px;
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

.voucher-search {
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

.icon-action:hover {
  border-color: rgba(255, 107, 43, 0.28);
  color: var(--primary);
  box-shadow: 0 10px 24px rgba(255, 107, 43, 0.1);
}

.filters-wrap {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 16px 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, #f8fbff 0%, #f9fafb 100%);
  border: 1px solid #edf2f7;
}

.filter-cluster {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.cluster-label {
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #94a3b8;
}

.filter-divider {
  width: 1px;
  align-self: stretch;
  background: #e2e8f0;
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-pills.compact {
  gap: 8px;
}

.filter-pill {
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

.filter-pill:hover {
  border-color: rgba(255, 107, 43, 0.24);
  color: var(--primary);
}

.filter-pill.active {
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.12), rgba(255, 207, 84, 0.16));
  color: #c2410c;
  border-color: rgba(255, 107, 43, 0.18);
}

.pill-count {
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: inherit;
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
.voucher-row {
  display: grid;
  grid-template-columns: 1.1fr 1.8fr 1fr 1fr 1.1fr 1.45fr 1.15fr 1.45fr 0.95fr;
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

.voucher-row {
  padding: 24px;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
}

.voucher-row:last-child {
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

.code-pill {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 10px;
  background: #eef2ff;
  color: #111827;
  font-weight: 900;
  letter-spacing: 0.05em;
}

.name-cell,
.value-cell,
.usage-cell,
.expiry-cell,
.status-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.name-cell strong,
.value-cell strong,
.min-order-cell strong,
.expiry-cell strong,
.usage-copy strong {
  color: #0f172a;
  font-size: 0.98rem;
}

.name-cell span,
.value-cell span,
.expiry-cell span,
.usage-copy span,
.status-helper {
  color: #64748b;
  line-height: 1.55;
}

.type-pill,
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

.type-fixed {
  background: #dff4ff;
  color: #0b749f;
}

.type-percent {
  background: #fff3c4;
  color: #9a6d03;
}

.usage-cell {
  gap: 10px;
}

.usage-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #edf2f7;
  overflow: hidden;
}

.usage-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ff7a31, #ffb11f);
}

.status-cell {
  gap: 12px;
}

.status-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.page-nav:disabled,
.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.insights-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.9fr);
  gap: 20px;
}

.campaign-card {
  position: relative;
  overflow: hidden;
  min-height: 260px;
  padding: 28px;
  border-radius: 30px;
  background:
    radial-gradient(circle at top right, rgba(255, 196, 77, 0.26), transparent 42%),
    linear-gradient(135deg, #23170d 0%, #4b2e1d 55%, #160f0a 100%);
  color: #fff;
  box-shadow: 0 20px 50px rgba(36, 24, 16, 0.22);
}

.campaign-card::after {
  content: '';
  position: absolute;
  inset: auto -10% -42% auto;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 182, 64, 0.28), transparent 70%);
}

.campaign-kicker {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff7a31, #ffb11f);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.campaign-card h2 {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  max-width: 480px;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.15;
}

.campaign-card p {
  position: relative;
  z-index: 1;
  margin-top: 14px;
  max-width: 520px;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.75;
}

.campaign-btn {
  position: relative;
  z-index: 1;
  margin-top: 28px;
  min-width: 160px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  background: rgba(255, 255, 255, 0.14) !important;
  color: #fff !important;
  box-shadow: none !important;
}

.campaign-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.insight-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.insight-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 22px;
  border-radius: 24px;
  border: 1px solid #edf2f7;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94));
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
}

.insight-card.accent {
  background: linear-gradient(180deg, rgba(255, 247, 237, 0.98), rgba(255, 255, 255, 0.92));
}

.insight-card.sky {
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.98), rgba(255, 255, 255, 0.92));
}

.insight-icon {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: #fff;
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  box-shadow: inset 0 0 0 1px rgba(255, 107, 43, 0.12);
}

.insight-copy strong {
  display: block;
  font-size: 1rem;
  color: #0f172a;
}

.insight-copy p {
  margin-top: 8px;
  color: #64748b;
  line-height: 1.7;
}

.text-right {
  text-align: right;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .insights-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1080px) {
  .table-head {
    display: none;
  }

  .voucher-row {
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
  .table-footer,
  .filters-wrap {
    flex-direction: column;
    align-items: stretch;
  }

  .search-wrap {
    width: 100%;
    max-width: none;
  }

  .filter-divider {
    width: 100%;
    height: 1px;
  }
}

@media (max-width: 720px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .voucher-row {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .voucher-shell,
  .campaign-card {
    padding: 20px;
  }

  .toolbar-actions {
    justify-content: flex-end;
  }

  .pagination-wrap {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}

@media (max-width: 560px) {
  .voucher-page {
    gap: 18px;
  }

  .voucher-shell {
    border-radius: 22px;
  }

  .stat-card,
  .campaign-card,
  .insight-card {
    border-radius: 22px;
  }

}
</style>
