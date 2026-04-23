<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import EmptyState from '@/components/ui/EmptyState.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useAppToast } from '@/composables/useToast'
import { orderService, type Order, type OrderFilter, type OrderStatus, type OrderSummary } from '@/services/order.service'
import { formatDateTime, formatNumber, formatVND } from '@/utils/format'

type OrderTabValue = 'ALL' | OrderStatus
type PaginationToken = number | 'ellipsis'

const router = useRouter()
const toast = useAppToast()

const loading = ref(true)
const orders = ref<Order[]>([])
const totalRecords = ref(0)
const activeTab = ref<OrderTabValue>('ALL')
const statusCounts = ref<Record<OrderStatus, number>>({
  PENDING: 0,
  PROCESSING: 0,
  SHIPPED: 0,
  DELIVERED: 0,
  COMPLETED: 0,
  CANCELLED: 0,
})
const summary = ref<OrderSummary>({
  total_orders: 0,
  pending_orders: 0,
  processing_orders: 0,
  shipped_orders: 0,
  delivered_orders: 0,
  completed_orders: 0,
  cancelled_orders: 0,
  urgent_orders: 0,
  new_orders_today: 0,
  today_revenue: 0,
  cancellation_rate: 0,
})

const filter = ref<OrderFilter>({
  page: 1,
  limit: 8,
  search: '',
  sort_order: 'desc',
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

const sortOptions = [
  { label: 'Mới nhất trước', value: 'desc' },
  { label: 'Cũ nhất trước', value: 'asc' },
]

const statusLabelMap: Record<OrderTabValue, string> = {
  ALL: 'Tất cả',
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đã xác nhận',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}

const totalPages = computed(() => {
  const limit = Number(filter.value.limit || 1)
  return Math.max(1, Math.ceil(totalRecords.value / limit))
})

const tabs = computed(() => [
  { label: statusLabelMap.ALL, value: 'ALL' as OrderTabValue, count: summary.value.total_orders },
  { label: statusLabelMap.PENDING, value: 'PENDING' as OrderTabValue, count: statusCounts.value.PENDING },
  { label: statusLabelMap.PROCESSING, value: 'PROCESSING' as OrderTabValue, count: statusCounts.value.PROCESSING },
  { label: statusLabelMap.SHIPPED, value: 'SHIPPED' as OrderTabValue, count: statusCounts.value.SHIPPED },
  { label: statusLabelMap.DELIVERED, value: 'DELIVERED' as OrderTabValue, count: statusCounts.value.DELIVERED },
  { label: statusLabelMap.COMPLETED, value: 'COMPLETED' as OrderTabValue, count: statusCounts.value.COMPLETED },
  { label: statusLabelMap.CANCELLED, value: 'CANCELLED' as OrderTabValue, count: statusCounts.value.CANCELLED },
])

const statCards = computed(() => [
  {
    label: 'Doanh thu hôm nay',
    value: formatVND(summary.value.today_revenue),
    hint: summary.value.today_revenue > 0 ? `${formatNumber(summary.value.new_orders_today)} đơn mới` : 'Chưa có giao dịch hôm nay',
    tone: 'warm',
  },
  {
    label: 'Đơn hàng mới',
    value: formatNumber(summary.value.new_orders_today),
    hint: summary.value.new_orders_today > 0 ? 'Tính từ 00:00 hôm nay' : 'Chưa phát sinh đơn mới',
    tone: 'sky',
  },
  {
    label: 'Tỷ lệ hủy',
    value: `${summary.value.cancellation_rate.toFixed(1)}%`,
    hint: `${formatNumber(summary.value.cancelled_orders)} đơn đã hủy`,
    tone: summary.value.cancellation_rate > 10 ? 'danger' : 'emerald',
  },
  {
    label: 'Chờ xử lý',
    value: formatNumber(summary.value.urgent_orders),
    hint: summary.value.urgent_orders > 0 ? 'Cần xác nhận hoặc xuất kho sớm' : 'Không có đơn tồn xử lý',
    tone: summary.value.urgent_orders > 0 ? 'orange' : 'slate',
  },
])

const pageSummary = computed(() => {
  if (!orders.value.length) {
    return `Hiển thị 0 - 0 trên tổng ${formatNumber(totalRecords.value)} đơn hàng`
  }

  const page = Number(filter.value.page || 1)
  const limit = Number(filter.value.limit || orders.value.length)
  const start = (page - 1) * limit + 1
  const end = start + orders.value.length - 1

  return `Hiển thị ${formatNumber(start)} - ${formatNumber(end)} trên tổng ${formatNumber(totalRecords.value)} đơn hàng`
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

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'KH'
}

const paymentMethodLabel = (method: Order['payment_method']) => (method === 'VNPAY' ? 'VNPay' : 'COD')

const paymentStatusText = (order: Order) => {
  if (order.payment_status === 'PAID') return 'Đã thanh toán'
  if (order.payment_status === 'FAILED') return 'Thanh toán lỗi'
  if (order.payment_status === 'EXPIRED') return 'Quá hạn thanh toán'
  if (order.payment_status === 'REFUNDED') return 'Đã hoàn tiền'
  return order.payment_method === 'COD' ? 'Thu tiền khi nhận' : 'Chờ thanh toán'
}

const statusHelperText = (order: Order) => {
  if (order.order_status === 'PENDING') return 'Cần xác nhận đơn'
  if (order.order_status === 'PROCESSING') return 'Đang chuẩn bị hàng'
  if (order.order_status === 'SHIPPED') return 'Đang trên đường giao'
  if (order.order_status === 'DELIVERED') return 'Đã giao cho khách'
  if (order.order_status === 'COMPLETED') return 'Đã giao cho khách'
  return 'Đơn đã hủy'
}

const fetchCountByStatus = async () => {
  const { data } = await orderService.countByStatus()
  statusCounts.value = data.data
}

const fetchSummary = async () => {
  const { data } = await orderService.getSummary()
  summary.value = data.data
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const params = {
      ...filter.value,
      order_status: activeTab.value === 'ALL' ? undefined : activeTab.value,
    }
    const { data } = await orderService.getAll(params)
    const result = data.data
    orders.value = result.data || result.items || []
    totalRecords.value = Number(result.meta?.total ?? result.total ?? orders.value.length)
  } catch {
    toast.error('Không thể tải danh sách đơn hàng')
  } finally {
    loading.value = false
  }
}

const fetchAll = async () => {
  try {
    await Promise.all([fetchCountByStatus(), fetchSummary(), fetchOrders()])
  } catch {
    toast.error('Không thể tải tổng quan đơn hàng')
  }
}

const applySearch = () => {
  filter.value.page = 1
  fetchOrders()
}

const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(applySearch, 350)
}

const selectTab = (value: OrderTabValue) => {
  activeTab.value = value
  filter.value.page = 1
  fetchOrders()
}

const refreshAll = () => {
  fetchAll()
}

const viewDetail = (orderId: string) => {
  router.push(`/orders/${orderId}`)
}

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === filter.value.page) return
  filter.value.page = page
  fetchOrders()
}

onMounted(fetchAll)
</script>

<template>
  <div class="orders-page">
    <section class="page-header orders-page-header">
      <div>
        <h1 class="page-title">Quản lý đơn hàng</h1>
        <p class="page-subtitle">Theo dõi đơn mới, tiến độ xử lý, trạng thái đã giao và thời điểm hoàn tất sau xác nhận của khách.</p>
      </div>
      <Button icon="pi pi-refresh" label="Làm mới" outlined class="refresh-btn" @click="refreshAll" />
    </section>

    <section class="stat-grid order-stats">
      <article v-for="card in statCards" :key="card.label" class="stat-card" :class="`stat-${card.tone}`">
        <p class="stat-label">{{ card.label }}</p>
        <strong class="stat-value">{{ card.value }}</strong>
        <p class="stat-hint">{{ card.hint }}</p>
      </article>
    </section>

    <section class="orders-shell">
      <div class="orders-toolbar">
        <div class="tabs-wrap">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="tab-btn"
            :class="{ active: activeTab === tab.value }"
            @click="selectTab(tab.value)"
          >
            <span>{{ tab.label }}</span>
            <span class="tab-count">{{ formatNumber(tab.count) }}</span>
          </button>
        </div>

        <div class="toolbar-actions">
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <InputText
              v-model="filter.search"
              placeholder="Tìm mã đơn, khách hàng hoặc số điện thoại..."
              class="orders-search"
              @input="onSearchInput"
              @keyup.enter="applySearch"
            />
          </div>

          <Select
            v-model="filter.sort_order"
            :options="sortOptions"
            optionLabel="label"
            optionValue="value"
            class="sort-select"
            @change="applySearch"
          />

          <Button icon="pi pi-refresh" label="Làm mới" outlined class="refresh-btn" @click="refreshAll" />
        </div>
      </div>

      <div class="table-shell">
        <div class="table-head">
          <div>Mã đơn</div>
          <div>Khách hàng</div>
          <div>Số điện thoại</div>
          <div>Tổng tiền</div>
          <div>Thanh toán</div>
          <div>Trạng thái</div>
          <div>Ngày tạo</div>
          <div class="text-right">Thao tác</div>
        </div>

        <div v-if="loading" class="table-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <div v-else-if="!orders.length" class="empty-wrap">
          <EmptyState
            icon="pi pi-receipt"
            title="Chưa có đơn hàng"
            description="Khi có đơn phát sinh, bạn sẽ theo dõi ngay tại đây."
          >
            <div class="empty-actions">
              <Button label="Làm mới danh sách" icon="pi pi-refresh" @click="refreshAll" />
            </div>
          </EmptyState>
        </div>

        <template v-else>
          <div v-for="order in orders" :key="order.id" class="order-row">
            <div class="order-code-cell">
              <button class="order-link" @click="viewDetail(order.id)">
                #{{ order.order_code }}
              </button>
              <span class="row-helper">{{ order.items.length }} dòng sản phẩm</span>
            </div>

            <div class="customer-cell">
              <div class="customer-avatar">{{ getInitials(order.customer_name) }}</div>
              <div class="customer-meta">
                <strong>{{ order.customer_name }}</strong>
                <span>{{ order.customer_email || 'Khách mua tại cửa hàng' }}</span>
              </div>
            </div>

            <div class="phone-cell">
              <strong>{{ order.customer_phone || '—' }}</strong>
              <span class="row-helper">{{ order.shipping_method_name || 'Chưa gán vận chuyển' }}</span>
            </div>

            <div class="money-cell">
              <strong>{{ formatVND(order.total_amount) }}</strong>
              <span class="row-helper">Tạm tính {{ formatVND(order.subtotal) }}</span>
            </div>

            <div class="payment-cell">
              <strong>{{ paymentMethodLabel(order.payment_method) }}</strong>
              <span class="payment-copy">{{ paymentStatusText(order) }}</span>
            </div>

            <div class="status-cell">
              <StatusBadge :status="order.order_status" />
              <span class="row-helper">{{ statusHelperText(order) }}</span>
            </div>

            <div class="date-cell">
              <strong>{{ formatDateTime(order.created_at) }}</strong>
              <span class="row-helper">Cập nhật {{ formatDateTime(order.updated_at) }}</span>
            </div>

            <div class="row-actions">
              <Button label="Xem" outlined class="action-view" @click="viewDetail(order.id)" />
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
  </div>
</template>

<style scoped>
.orders-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.orders-shell {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 249, 245, 0.92));
  border: 1px solid #edf2f7;
  border-radius: 28px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.04);
}

.orders-page-header {
  margin-bottom: 0;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.order-stats {
  margin-top: -4px;
}

.stat-card {
  min-height: 164px;
  padding: 22px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.stat-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #94a3b8;
  font-weight: 800;
}

.stat-value {
  margin-top: 20px;
  display: block;
  font-size: clamp(1.9rem, 3vw, 2.8rem);
  font-weight: 900;
  color: #111827;
}

.stat-hint {
  margin-top: 18px;
  font-size: 0.92rem;
  font-weight: 700;
}

.stat-warm { background: linear-gradient(135deg, #fff7ed, #ffffff 72%); }
.stat-sky { background: linear-gradient(135deg, #eff6ff, #ffffff 72%); }
.stat-emerald { background: linear-gradient(135deg, #ecfdf5, #ffffff 72%); }
.stat-orange { background: linear-gradient(135deg, #fff7ed, #ffffff 72%); }
.stat-danger { background: linear-gradient(135deg, #fef2f2, #ffffff 72%); }
.stat-slate { background: linear-gradient(135deg, #f8fafc, #ffffff 72%); }

.orders-shell {
  padding: 18px 0 0;
  overflow: hidden;
}

.orders-toolbar {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 24px 22px;
}

.tabs-wrap {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #475569;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
}

.tab-btn.active {
  color: #c2410c;
  border-bottom-color: #ea580c;
}

.tab-count {
  min-width: 28px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.78rem;
  text-align: center;
}

.toolbar-actions {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) 220px auto;
  gap: 14px;
  align-items: center;
}

.search-wrap {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}

.orders-search :deep(.p-inputtext) {
  width: 100%;
  border-radius: 16px;
  padding-left: 42px;
  height: 52px;
}

.sort-select :deep(.p-select),
.refresh-btn,
.refresh-btn :deep(.p-button) {
  height: 52px;
  border-radius: 16px;
}

.table-head,
.order-row {
  display: grid;
  grid-template-columns: 1.05fr 1.5fr 1.15fr 1fr 1fr 1fr 1.1fr 0.75fr;
  gap: 18px;
  align-items: center;
  padding: 18px 24px;
}

.table-head {
  background: #f8fafc;
  color: #94a3b8;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 800;
}

.order-row {
  border-top: 1px solid #f1f5f9;
  background: rgba(255, 255, 255, 0.82);
}

.order-link {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 1.2rem;
  font-weight: 900;
  color: #c2410c;
  cursor: pointer;
  text-align: left;
}

.row-helper,
.payment-copy,
.customer-meta span {
  display: block;
  margin-top: 6px;
  font-size: 0.8rem;
  color: #94a3b8;
}

.customer-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #eef2ff, #f8fafc);
  color: #334155;
  font-weight: 900;
}

.customer-meta strong,
.phone-cell strong,
.money-cell strong,
.payment-cell strong,
.date-cell strong {
  color: #0f172a;
  font-weight: 800;
}

.status-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
}

.action-view :deep(.p-button) {
  border-radius: 14px;
  min-width: 92px;
  font-weight: 800;
}

.table-loading,
.empty-wrap {
  display: flex;
  justify-content: center;
  padding: 52px 24px;
}

.table-loading i {
  font-size: 2rem;
  color: var(--primary);
}

.empty-actions {
  margin-top: 16px;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px 24px;
  border-top: 1px solid #f1f5f9;
}

.footer-copy {
  color: #64748b;
}

.pagination-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-nav,
.page-btn {
  min-width: 42px;
  height: 42px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  font-weight: 800;
  color: #475569;
  cursor: pointer;
}

.page-btn.active {
  background: linear-gradient(135deg, #ff6b2b, #ffb703);
  border-color: transparent;
  color: #fff;
}

.page-btn.ghost,
.page-btn:disabled,
.page-nav:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.text-right {
  text-align: right;
}

@media (max-width: 1280px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .table-head,
  .order-row {
    grid-template-columns: 1fr 1.25fr 1fr 0.95fr 0.9fr 0.95fr 1fr 0.7fr;
  }
}

@media (max-width: 1080px) {
  .toolbar-actions {
    grid-template-columns: 1fr;
  }

  .table-head {
    display: none;
  }

  .order-row {
    grid-template-columns: 1fr 1fr;
  }

  .row-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .orders-shell {
    border-radius: 22px;
  }

  .orders-toolbar,
  .table-footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .stat-grid {
    grid-template-columns: 1fr;
  }

  .order-row {
    grid-template-columns: 1fr;
    padding: 18px 16px;
  }

  .table-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
