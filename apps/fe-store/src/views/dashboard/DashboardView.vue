<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { dashboardService } from '@/services/dashboard.service'
import { useAppToast } from '@/composables/useToast'
import { formatVND, formatNumber } from '@/utils/format'
import Button from 'primevue/button'
import { useNotificationStore } from '@/stores/notification.store'

const toast = useAppToast()
const notificationStore = useNotificationStore()
const loading = ref(true)

// Summary
const summary = ref<any>({})
const dashboardSummary = computed(() => ({
  totalRevenue: Number(summary.value?.revenue?.total ?? summary.value?.totalRevenue ?? 0),
  totalOrders: Number(summary.value?.orders?.total ?? summary.value?.totalOrders ?? 0),
  pendingOrders: Number(summary.value?.orders?.pending ?? summary.value?.pendingOrders ?? 0),
  lowStockCount: Number(summary.value?.products?.low_stock ?? summary.value?.lowStockCount ?? 0),
}))

// Revenue chart
const revenueType = ref<'7d' | '30d' | '3m'>('7d')
const revenueTypeOptions = [
  { label: '7 ngày', value: '7d' },
  { label: '30 ngày', value: '30d' },
  { label: '3 tháng', value: '3m' },
]
const chartOptions = ref<any>({
  chart: {
    type: 'area',
    height: 300,
    toolbar: { show: false },
    fontFamily: 'Inter',
    sparkline: { enabled: false },
  },
  colors: ['#FF6B2B'],
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.45,
      opacityTo: 0.05,
      stops: [0, 90, 100],
    },
  },
  stroke: { curve: 'smooth', width: 3 },
  dataLabels: { enabled: false },
  xaxis: {
    categories: [],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { fontSize: '12px', colors: '#9CA3AF', fontWeight: 500 } },
  },
  yaxis: {
    min: 0,
    decimalsInFloat: 0,
    labels: {
      formatter: (v: number) => formatCompactVND(v),
      style: { fontSize: '12px', colors: '#9CA3AF' },
    },
  },
  tooltip: {
    y: { formatter: (v: number) => formatVND(v) },
    theme: 'light',
  },
  grid: {
    borderColor: '#F3F4F6',
    strokeDashArray: 4,
    padding: { left: 8, right: 8 },
  },
  markers: {
    size: 0,
    hover: { size: 6, sizeOffset: 3 },
  },
  noData: {
    text: 'Chưa có dữ liệu doanh thu',
    align: 'center',
    verticalAlign: 'middle',
    style: { color: '#9CA3AF', fontSize: '14px' },
  },
})
const chartSeries = ref([{ name: 'Doanh thu', data: [] as number[] }])

// Top selling
const topSelling = ref<any[]>([])
const topNotSelling = ref<any[]>([])

// Order Status (Donut)
const orderStatus = ref<any>({ total: 0, breakdown: [] })
const donutOptions = ref<any>({
  chart: { type: 'donut', fontFamily: 'Inter' },
  colors: ['#9CA3AF', '#3B82F6', '#FFD700', '#10B981', '#EF4444'],
  labels: ['Chờ xử lý', 'Đang xử lý', 'Đang giao', 'Đã giao', 'Đã hủy'],
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      donut: {
        size: '72%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'TỔNG ĐƠN',
            color: '#FF6B2B',
            fontSize: '12px',
            fontWeight: 700,
            formatter: () => '',
          },
          value: {
            fontSize: '24px',
            fontWeight: 800,
            color: '#111827',
          },
        },
      },
    },
  },
  stroke: { width: 2 },
  tooltip: {
    y: { formatter: (v: number) => `${v} đơn` },
  },
})
const donutSeries = ref<number[]>([])

// Recent orders
const recentOrders = ref<any[]>([])

const statusLabelMap: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}
const statusColorMap: Record<string, string> = {
  PENDING: '#9CA3AF',
  PROCESSING: '#3B82F6',
  SHIPPED: '#FFD700',
  DELIVERED: '#F59E0B',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
}
const getStatusLabel = (status: string) => ({
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
} as Record<string, string>)[status] || status
const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN')
const shortId = (id: string) => '#' + id.substring(0, 8).toUpperCase()
const formatCompactVND = (value: number) => {
  const amount = Number(value || 0)
  if (amount >= 1_000_000_000) return `${formatNumber(Math.round(amount / 1_000_000_000))} tỷ`
  if (amount >= 1_000_000) return `${formatNumber(Math.round(amount / 1_000_000))} tr`
  if (amount >= 1_000) return `${formatNumber(Math.round(amount / 1_000))}k`
  return formatNumber(amount)
}
const getProductName = (item: any) => item.product_name || item.name || 'Sản phẩm'
const getProductImage = (item: any) =>
  item.image_url
  || item.image
  || item.images?.[0]?.image_url
  || item.images?.[0]?.url
  || null
const getSoldCount = (item: any) => Number(item.total_sold ?? item.totalSold ?? item.sold ?? 0)
const getProductRevenue = (item: any) => Number(item.total_revenue ?? item.totalRevenue ?? item.revenue ?? 0)
const getProductStock = (item: any) =>
  Number(item.totalStock ?? item.stock ?? item.variants?.reduce((sum: number, variant: any) => sum + Number(variant.stock || 0), 0) ?? 0)

const fetchSummary = async () => {
  try {
    const { data } = await dashboardService.getSummary()
    summary.value = data.data
  } catch { /* ignore */ }
}

const fetchRevenue = async () => {
  try {
    const now = new Date()
    let from: Date
    let type: 'day' | 'month' | 'year'

    if (revenueType.value === '7d') {
      from = new Date(now)
      from.setDate(from.getDate() - 6)
      type = 'day'
    } else if (revenueType.value === '30d') {
      from = new Date(now)
      from.setDate(from.getDate() - 29)
      type = 'day'
    } else {
      from = new Date(now)
      from.setMonth(from.getMonth() - 2)
      from.setDate(1)
      type = 'month'
    }
    from.setHours(0, 0, 0, 0)

    const { data } = await dashboardService.getRevenue({
      type,
      from: from.toISOString(),
      to: now.toISOString(),
    })
    const result = data.data
    if (Array.isArray(result)) {
      chartOptions.value = {
        ...chartOptions.value,
        xaxis: {
          ...chartOptions.value.xaxis,
          categories: result.map((r: any) => r.label || r.date || r.period || r.time),
        },
      }
      chartSeries.value = [{
        name: 'Doanh thu',
        data: result.map((r: any) => Number(r.revenue ?? r.total ?? 0)),
      }]
    }
  } catch { /* ignore */ }
}

const fetchTop = async () => {
  try {
    const [selling, notSelling] = await Promise.all([
      dashboardService.getTopSelling({ top: 5 }),
      dashboardService.getTopNotSelling({ top: 5 }),
    ])
    topSelling.value = selling.data.data || []
    topNotSelling.value = notSelling.data.data || []
  } catch { /* ignore */ }
}

const fetchOrderStatus = async () => {
  try {
    const { data } = await dashboardService.getOrderStatus()
    const result = data.data
    orderStatus.value = result
    const statusOrder = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    donutSeries.value = statusOrder.map(s => {
      if (s === 'DELIVERED') {
        const delivered = result.breakdown?.find((b: any) => b.status === 'DELIVERED')?.count || 0
        const completed = result.breakdown?.find((b: any) => b.status === 'COMPLETED')?.count || 0
        return delivered + completed
      }
      const item = result.breakdown?.find((b: any) => b.status === s)
      return item?.count || 0
    })
    donutOptions.value = {
      ...donutOptions.value,
      labels: statusOrder.map(s => getStatusLabel(s)),
      plotOptions: {
        pie: {
          donut: {
            ...donutOptions.value.plotOptions.pie.donut,
            labels: {
              ...donutOptions.value.plotOptions.pie.donut.labels,
              total: {
                ...donutOptions.value.plotOptions.pie.donut.labels.total,
                formatter: () => String(result.total || 0),
              },
            },
          },
        },
      },
    }
  } catch { /* ignore */ }
}

const fetchRecentOrders = async () => {
  try {
    const { data } = await dashboardService.getRecentOrders()
    recentOrders.value = data.data || []
  } catch { /* ignore */ }
}

const exportFile = async (type: 'excel' | 'pdf') => {
  try {
    const fn = type === 'excel' ? dashboardService.exportExcel : dashboardService.exportPdf
    const exportType = revenueType.value === '3m' ? 'month' : 'day'
    const res = await fn({ type: exportType })
    const blob = new Blob([res.data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BaoCao_${Date.now()}.${type === 'excel' ? 'xlsx' : 'pdf'}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Xuất file thành công!')
  } catch {
    toast.error('Không thể xuất file')
  }
}

watch(revenueType, () => fetchRevenue())

const fetchAllData = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    await Promise.all([
      fetchSummary(),
      fetchRevenue(),
      fetchTop(),
      fetchOrderStatus(),
      fetchRecentOrders()
    ])
  } finally {
    if (!silent) loading.value = false
  }
}

const handleSocketUpdate = (payload: any) => {
  console.log('[Dashboard] Received order update signal:', payload)
  // Refresh data silently after a small delay to ensure DB consistency
  setTimeout(() => {
    fetchAllData(true)
  }, 500)
}

onMounted(() => {
  fetchAllData()
  
  if (notificationStore.socket) {
    notificationStore.socket.on('order:updated', handleSocketUpdate)
  }
})

onUnmounted(() => {
  if (notificationStore.socket) {
    notificationStore.socket.off('order:updated', handleSocketUpdate)
  }
})

watch(() => notificationStore.socket, (newSocket, oldSocket) => {
  if (oldSocket) oldSocket.off('order:updated', handleSocketUpdate)
  if (newSocket) newSocket.on('order:updated', handleSocketUpdate)
})
</script>

<template>
  <div v-if="loading" class="loading-wrap">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
  </div>

  <div v-else class="dashboard">
    <div class="page-header dashboard-header">
      <div>
        <h1 class="page-title">Tổng quan kinh doanh</h1>
        <p class="page-subtitle">Theo dõi doanh thu, đơn hàng, tồn kho và hiệu quả sản phẩm trong cửa hàng.</p>
      </div>
      <div class="dashboard-header-actions">
        <Button
          label="Xuất Excel"
          icon="pi pi-file-excel"
          class="export-btn export-excel"
          @click="exportFile('excel')"
        />
        <Button
          label="Xuất PDF"
          icon="pi pi-file-pdf"
          class="export-btn export-pdf"
          @click="exportFile('pdf')"
        />
      </div>
    </div>

    <!-- ═══ Stat Cards ═══ -->
    <div class="stat-grid">
      <!-- Tổng doanh thu -->
      <div class="stat-card">
        <div class="stat-left">
          <span class="stat-label">TỔNG DOANH THU</span>
          <span class="stat-value">{{ formatVND(dashboardSummary.totalRevenue) }}</span>
          <span v-if="summary.revenueTrend" class="stat-trend trend-up">
            <i class="pi pi-arrow-up" style="font-size: 0.55rem"></i>
            +{{ summary.revenueTrend }}% so với tháng trước
          </span>
          <span v-else class="stat-sub">Dữ liệu cập nhật liên tục</span>
        </div>
        <div class="stat-icon-box" style="background: #FFF3ED; color: #FF6B2B">
          <i class="pi pi-chart-line"></i>
        </div>
      </div>

      <!-- Tổng đơn hàng -->
      <div class="stat-card">
        <div class="stat-left">
          <span class="stat-label">TỔNG ĐƠN HÀNG</span>
          <span class="stat-value">{{ formatNumber(dashboardSummary.totalOrders) }}</span>
          <span class="stat-sub">Dữ liệu cập nhật liên tục</span>
        </div>
        <div class="stat-icon-box" style="background: #EFF6FF; color: #3B82F6">
          <i class="pi pi-shopping-cart"></i>
        </div>
      </div>

      <!-- Đơn chờ xử lý -->
      <div class="stat-card">
        <div class="stat-left">
          <span class="stat-label">ĐƠN CHỜ XỬ LÝ</span>
          <span class="stat-value">{{ formatNumber(dashboardSummary.pendingOrders) }}</span>
          <span v-if="dashboardSummary.pendingOrders > 0" class="stat-badge badge-warning">CẦN XỬ LÝ</span>
          <span v-else class="stat-sub">Không có đơn chờ</span>
        </div>
        <div class="stat-icon-box" style="background: #FFF7ED; color: #F59E0B">
          <i class="pi pi-clock"></i>
        </div>
      </div>

      <!-- Sắp hết hàng -->
      <div class="stat-card">
        <div class="stat-left">
          <span class="stat-label">SẢN PHẨM SẮP HẾT</span>
          <span class="stat-value">{{ formatNumber(dashboardSummary.lowStockCount) }}</span>
          <span v-if="dashboardSummary.lowStockCount > 0" class="stat-badge badge-danger">CẢNH BÁO</span>
          <span v-else class="stat-sub">Dưới ngưỡng an toàn</span>
        </div>
        <div class="stat-icon-box" style="background: #FEF2F2; color: #EF4444">
          <i class="pi pi-exclamation-triangle"></i>
        </div>
      </div>
    </div>

    <!-- ═══ Charts Row: Revenue + Order Status ═══ -->
    <div class="charts-row">
      <!-- Revenue Chart -->
      <div class="chart-card app-card">
        <div class="chart-header">
          <div>
            <h3 class="chart-title">Phân tích doanh thu</h3>
            <p class="chart-subtitle">Thống kê chi tiết tăng trưởng doanh số</p>
          </div>
          <div class="chart-tabs">
            <button
              v-for="opt in revenueTypeOptions"
              :key="opt.value"
              class="chart-tab"
              :class="{ active: revenueType === opt.value }"
              @click="revenueType = opt.value as any"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="chart-body">
          <ApexChart type="area" :options="chartOptions" :series="chartSeries" :height="280" />
        </div>
      </div>

      <!-- Order Status Donut -->
      <div class="app-card donut-card">
        <div class="donut-header">
          <h3 class="chart-title">Trạng thái đơn hàng</h3>
          <p class="chart-subtitle">Tỷ lệ xử lý theo từng trạng thái</p>
        </div>
        <div class="donut-body">
          <ApexChart
            v-if="donutSeries.length"
            type="donut"
            :options="donutOptions"
            :series="donutSeries"
            :height="200"
          />
          <div v-else class="donut-empty">
            <i class="pi pi-chart-pie" style="font-size: 2rem; color: #E5E7EB"></i>
            <p>Chưa có đơn hàng</p>
          </div>
        </div>
        <div class="donut-legend">
          <div
            v-for="item in orderStatus.breakdown
              ?.filter((b: any) => b.status !== 'COMPLETED')
              .map((b: any) => b.status === 'DELIVERED'
                ? { ...b, count: b.count + (orderStatus.breakdown.find((c: any) => c.status === 'COMPLETED')?.count || 0), percentage: b.percentage + (orderStatus.breakdown.find((c: any) => c.status === 'COMPLETED')?.percentage || 0) }
                : b
              )"
            :key="item.status"
            class="legend-item"
          >
            <span class="legend-dot" :style="{ background: statusColorMap[item.status] }"></span>
            <span class="legend-label">{{ getStatusLabel(item.status) }}</span>
            <span class="legend-value">{{ item.percentage }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Top Products ═══ -->
    <div class="tables-grid">
      <!-- Bán chạy -->
      <div class="app-card table-card">
        <div class="table-header">
          <h3 class="table-title">Sản phẩm bán chạy</h3>
          <RouterLink to="/products" class="table-link">Xem tất cả</RouterLink>
        </div>
        <table class="simple-table">
          <thead>
            <tr>
              <th>SẢN PHẨM</th>
              <th class="text-center">ĐÃ BÁN</th>
              <th class="text-right hide-mobile">DOANH THU</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in topSelling" :key="item.id || item.name">
              <td>
                <div class="product-cell">
                  <img
                    v-if="getProductImage(item)"
                    :src="getProductImage(item)"
                    class="product-thumb"
                  />
                  <div v-else class="product-thumb-placeholder">
                    <i class="pi pi-image" style="font-size: 0.7rem; color: #CBD5E1"></i>
                  </div>
                  <div>
                    <p class="product-name">{{ getProductName(item) }}</p>
                    <p class="product-cat">{{ item.category_name || item.category?.name || '' }}</p>
                  </div>
                </div>
              </td>
              <td class="text-center font-semibold">{{ formatNumber(getSoldCount(item)) }}</td>
              <td class="text-right hide-mobile" style="color: #10B981; font-weight: 600">
                {{ formatVND(getProductRevenue(item)) }}
              </td>
            </tr>
            <tr v-if="!topSelling.length">
              <td colspan="3" class="text-center" style="color: #9CA3AF; padding: 32px 0">Chưa có dữ liệu</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Bán chậm -->
      <div class="app-card table-card">
        <div class="table-header">
          <h3 class="table-title">Sản phẩm ít bán nhất</h3>
          <button class="info-icon" title="Sản phẩm cần chú ý">
            <i class="pi pi-info-circle" style="color: #3B82F6"></i>
          </button>
        </div>
        <div class="slow-list">
          <div v-for="item in topNotSelling" :key="item.id || item.name" class="slow-item">
            <img
              v-if="getProductImage(item)"
              :src="getProductImage(item)"
              class="product-thumb"
            />
            <div v-else class="product-thumb-placeholder">
              <i class="pi pi-image" style="font-size: 0.7rem; color: #CBD5E1"></i>
            </div>
            <div class="slow-info">
              <p class="product-name">{{ getProductName(item) }}</p>
              <div class="slow-stats">
                <span>Đã bán: <b>{{ formatNumber(getSoldCount(item)) }}</b></span>
                <span style="color: #EF4444">Tồn: <b>{{ formatNumber(getProductStock(item)) }}</b></span>
              </div>
            </div>
          </div>
          <div v-if="!topNotSelling.length" class="text-center" style="color: #9CA3AF; padding: 32px 0">
            Chưa có dữ liệu
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Recent Transactions ═══ -->
    <div class="app-card table-card" style="margin-bottom: 24px">
      <div class="table-header">
        <div>
          <h3 class="table-title">Đơn hàng gần đây</h3>
          <p style="font-size: 0.75rem; color: #9CA3AF; margin-top: 2px">Các đơn mới nhất trong hệ thống</p>
        </div>
        <RouterLink to="/orders" class="table-link">Xem tất cả đơn</RouterLink>
      </div>
      <table class="simple-table">
        <thead>
          <tr>
            <th>NGÀY</th>
            <th>KHÁCH HÀNG</th>
            <th class="hide-mobile">MÃ ĐƠN</th>
            <th class="text-right">SỐ TIỀN</th>
            <th class="text-center">TRẠNG THÁI</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in recentOrders" :key="order.id">
            <td style="white-space: nowrap">{{ formatDate(order.created_at) }}</td>
            <td>
              <div class="customer-cell">
                <div class="customer-avatar" :style="{ background: statusColorMap[order.order_status] || '#FF6B2B' }">
                  {{ (order.customer?.name || order.receiver_name || '?').charAt(0).toUpperCase() }}
                </div>
                <span>{{ order.customer?.name || order.receiver_name || 'Khách vãng lai' }}</span>
              </div>
            </td>
            <td class="hide-mobile" style="font-family: monospace; font-size: 0.78rem; color: #6B7280">
              {{ shortId(order.id) }}
            </td>
            <td class="text-right font-semibold">{{ formatVND(order.total) }}</td>
            <td class="text-center">
              <span
                class="order-status-badge"
                :style="{
                  background: statusColorMap[order.order_status] + '18',
                  color: statusColorMap[order.order_status],
                  borderColor: statusColorMap[order.order_status] + '40',
                }"
              >
                {{ getStatusLabel(order.order_status) }}
              </span>
            </td>
          </tr>
          <tr v-if="!recentOrders.length">
            <td colspan="5" class="text-center" style="color: #9CA3AF; padding: 32px 0">Chưa có đơn hàng</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ Export Buttons ═══ -->
    <div class="export-row">
      <Button
        label="Xuất Excel"
        icon="pi pi-file-excel"
        class="export-btn export-excel"
        @click="exportFile('excel')"
      />
      <Button
        label="Xuất PDF"
        icon="pi pi-file-pdf"
        class="export-btn export-pdf"
        @click="exportFile('pdf')"
      />
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  width: 100%;
}

.dashboard-header {
  margin-bottom: 24px;
}

.dashboard-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

/* ═══ Stat Cards ═══ */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  transition: all 0.25s ease;
}
.stat-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.stat-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #9CA3AF;
  text-transform: uppercase;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1.3;
  margin: 2px 0;
}

.stat-sub {
  font-size: 0.72rem;
  color: #9CA3AF;
}

.stat-trend {
  font-size: 0.72rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}
.trend-up { color: #10B981; }
.trend-down { color: #EF4444; }

.stat-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.62rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  width: fit-content;
  letter-spacing: 0.03em;
}
.badge-warning {
  background: #FEF3C7;
  color: #D97706;
}
.badge-danger {
  background: #FEE2E2;
  color: #DC2626;
}

.stat-icon-box {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

/* ═══ Charts Row ═══ */
.charts-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.chart-card {
  padding: 24px;
}

.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.chart-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}
.chart-subtitle {
  font-size: 0.78rem;
  color: #9CA3AF;
  margin-top: 2px;
}

.chart-tabs {
  display: flex;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.chart-tab {
  padding: 8px 18px;
  font-size: 0.8rem;
  font-weight: 600;
  background: #fff;
  border: none;
  cursor: pointer;
  color: #6B7280;
  transition: all 0.2s ease;
  border-right: 1px solid var(--border);
}
.chart-tab:last-child { border-right: none; }

.chart-tab.active {
  background: var(--text-primary);
  color: #fff;
}
.chart-tab:hover:not(.active) {
  background: #F9FAFB;
}

.chart-body {
  margin: 0 -8px;
}

/* ═══ Tables ═══ */
.tables-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 16px;
  margin-bottom: 24px;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #F3F4F6;
}

.table-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
}

.table-link {
  font-size: 0.78rem;
  font-weight: 600;
  color: #FF6B2B;
  text-decoration: none;
  transition: color 0.15s;
}
.table-link:hover { color: #E05A22; }

.info-icon {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.15s;
}
.info-icon:hover { background: #EFF6FF; }

/* Simple Table */
.simple-table {
  width: 100%;
  border-collapse: collapse;
}
.simple-table th {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #9CA3AF;
  text-transform: uppercase;
  padding: 10px 20px;
  text-align: left;
  background: #FAFAFA;
}
.simple-table td {
  padding: 14px 20px;
  font-size: 0.85rem;
  border-bottom: 1px solid #F3F4F6;
  color: var(--text-primary);
}
.simple-table tbody tr:last-child td { border-bottom: none; }
.simple-table tbody tr:hover { background: #FAFAFA; }

.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-thumb {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
}

.product-thumb-placeholder {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 10px;
  background: #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-primary);
}
.product-cat {
  font-size: 0.72rem;
  color: #9CA3AF;
  margin-top: 1px;
}

/* Slow selling list */
.slow-list {
  padding: 8px 0;
}

.slow-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  transition: background 0.15s;
}
.slow-item:hover { background: #FAFAFA; }

.slow-info { flex: 1; min-width: 0; }

.slow-stats {
  display: flex;
  gap: 12px;
  margin-top: 3px;
  font-size: 0.72rem;
  color: #6B7280;
}

/* ═══ Export ═══ */
.export-row {
  display: none;
  justify-content: flex-end;
  gap: 12px;
}

.export-btn {
  border-radius: 10px !important;
  font-weight: 600 !important;
  padding: 10px 24px !important;
  font-size: 0.85rem !important;
}

.export-excel {
  background: #fff !important;
  border: 1.5px solid #FF6B2B !important;
  color: #FF6B2B !important;
}
.export-excel:hover {
  background: #FFF3ED !important;
}

.export-pdf {
  background: #fff !important;
  border: 1.5px solid #FF6B2B !important;
  color: #FF6B2B !important;
}
.export-pdf:hover {
  background: #FFF3ED !important;
}

/* ═══ Donut Card ═══ */
.donut-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
}
.donut-header {
  margin-bottom: 8px;
}
.donut-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
}
.donut-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #9CA3AF;
  font-size: 0.82rem;
}
.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #F3F4F6;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-label {
  flex: 1;
  color: #374151;
  font-weight: 500;
}
.legend-value {
  font-weight: 700;
  color: var(--text-primary);
}

/* ═══ Customer Cell ═══ */
.customer-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.customer-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.72rem;
  flex-shrink: 0;
}
.order-status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  border: 1px solid;
  white-space: nowrap;
}

/* ═══ Responsive ═══ */
@media (max-width: 1024px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .tables-grid { grid-template-columns: 1fr; }
  .charts-row { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .stat-grid { grid-template-columns: 1fr; }
  .stat-value { font-size: 1.2rem; }
  .chart-header { flex-direction: column; }
  .chart-tabs { width: 100%; }
  .chart-tab { flex: 1; text-align: center; }
  .export-row { flex-direction: column; }
  .export-btn { width: 100%; }
}

.text-center { text-align: center; }
.text-right { text-align: right; }
.font-semibold { font-weight: 600; }
</style>
