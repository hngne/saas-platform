<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { dashboardService } from '@/services/dashboard.service'
import { useAppToast } from '@/composables/useToast'
import { formatVND, formatNumber } from '@/utils/format'
import StatCard from '@/components/ui/StatCard.vue'
import Select from 'primevue/select'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const toast = useAppToast()
const loading = ref(true)

// Summary
const summary = ref<any>({})

// Revenue chart
const revenueType = ref<'day' | 'month' | 'year'>('day')
const revenueTypeOptions = [
  { label: 'Theo ngày', value: 'day' },
  { label: 'Theo tháng', value: 'month' },
  { label: 'Theo năm', value: 'year' },
]
const chartOptions = ref<any>({
  chart: { type: 'area', height: 320, toolbar: { show: false }, fontFamily: 'Inter' },
  colors: ['#FF6B2B'],
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
  stroke: { curve: 'smooth', width: 2.5 },
  dataLabels: { enabled: false },
  xaxis: { categories: [], labels: { style: { fontSize: '11px', colors: '#6B7280' } } },
  yaxis: { labels: { formatter: (v: number) => formatNumber(v), style: { fontSize: '11px', colors: '#6B7280' } } },
  tooltip: { y: { formatter: (v: number) => formatVND(v) } },
  grid: { borderColor: '#f3f4f6', strokeDashArray: 4 },
})
const chartSeries = ref([{ name: 'Doanh thu', data: [] as number[] }])
const chartHeight = computed(() => window.innerWidth < 768 ? 220 : 320)

// Top selling
const topSelling = ref<any[]>([])
const topNotSelling = ref<any[]>([])

const fetchSummary = async () => {
  try {
    const { data } = await dashboardService.getSummary()
    summary.value = data.data
  } catch { /* ignore */ }
}

const fetchRevenue = async () => {
  try {
    const { data } = await dashboardService.getRevenue({ type: revenueType.value })
    const result = data.data
    if (Array.isArray(result)) {
      chartOptions.value = {
        ...chartOptions.value,
        xaxis: { ...chartOptions.value.xaxis, categories: result.map((r: any) => r.label || r.date || r.period) },
      }
      chartSeries.value = [{ name: 'Doanh thu', data: result.map((r: any) => r.revenue || r.total || 0) }]
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

const exportFile = async (type: 'excel' | 'pdf') => {
  try {
    const fn = type === 'excel' ? dashboardService.exportExcel : dashboardService.exportPdf
    const res = await fn({ type: revenueType.value })
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

onMounted(async () => {
  await Promise.all([fetchSummary(), fetchRevenue(), fetchTop()])
  loading.value = false
})
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center" style="min-height: 400px">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
  </div>

  <div v-else class="dashboard">
    <!-- Section label -->
    <p class="page-section-label">TỔNG QUAN</p>

    <!-- Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Tổng doanh thu"
        :value="formatVND(summary.totalRevenue || 0)"
        icon="pi pi-wallet"
        :trend="summary.revenueTrend"
        color="#FF6B2B"
      />
      <StatCard
        title="Đơn hàng"
        :value="formatNumber(summary.totalOrders || 0)"
        icon="pi pi-shopping-cart"
        :trend="summary.orderTrend"
        color="#3B82F6"
      />
      <StatCard
        title="Sản phẩm đang bán"
        :value="formatNumber(summary.activeProducts || 0)"
        icon="pi pi-box"
        color="#10B981"
      />
      <StatCard
        title="Sắp hết hàng"
        :value="formatNumber(summary.lowStockCount || 0)"
        icon="pi pi-exclamation-triangle"
        color="#F59E0B"
      />
    </div>

    <!-- Revenue Chart -->
    <div class="app-card p-5 mb-6 fade-in-up">
      <div class="chart-header">
        <h3 class="text-sm font-bold" style="color: var(--text-primary)">Biểu đồ doanh thu</h3>
        <div class="chart-controls">
          <Select
            v-model="revenueType"
            :options="revenueTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="chart-select"
            @change="fetchRevenue()"
          />
          <Button icon="pi pi-file-excel" severity="success" text rounded size="small" class="hide-mobile" @click="exportFile('excel')" v-tooltip="'Xuất Excel'" />
          <Button icon="pi pi-file-pdf" severity="danger" text rounded size="small" class="hide-mobile" @click="exportFile('pdf')" v-tooltip="'Xuất PDF'" />
        </div>
      </div>
      <ApexChart type="area" :options="chartOptions" :series="chartSeries" :height="chartHeight" />
    </div>

    <!-- Top Selling / Not Selling -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="app-card p-5 fade-in-up">
        <h3 class="text-sm font-bold mb-4" style="color: var(--text-primary)">
          <i class="pi pi-arrow-up mr-2" style="color: #10B981"></i>Top bán chạy
        </h3>
        <DataTable :value="topSelling" :rows="5" class="text-sm">
          <Column field="name" header="Sản phẩm" />
          <Column field="total_sold" header="Đã bán" style="width: 90px; text-align: right">
            <template #body="{ data }">
              <span class="font-semibold">{{ formatNumber(data.total_sold || data.totalSold || 0) }}</span>
            </template>
          </Column>
          <Column field="revenue" header="Doanh thu" class="hide-mobile" style="width: 130px; text-align: right">
            <template #body="{ data }">
              <span class="font-semibold" style="color: #10B981">{{ formatVND(data.revenue || data.totalRevenue || 0) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>

      <div class="app-card p-5 fade-in-up">
        <h3 class="text-sm font-bold mb-4" style="color: var(--text-primary)">
          <i class="pi pi-arrow-down mr-2" style="color: #EF4444"></i>Bán chậm nhất
        </h3>
        <DataTable :value="topNotSelling" :rows="5" class="text-sm">
          <Column field="name" header="Sản phẩm" />
          <Column field="total_sold" header="Đã bán" style="width: 90px; text-align: right">
            <template #body="{ data }">
              <span class="font-semibold" style="color: #EF4444">{{ formatNumber(data.total_sold || data.totalSold || 0) }}</span>
            </template>
          </Column>
          <Column field="stock" header="Tồn kho" style="width: 90px; text-align: right">
            <template #body="{ data }">
              <span>{{ formatNumber(data.stock || data.totalStock || 0) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1400px;
}
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.chart-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.chart-select { width: 140px; }

@media (max-width: 768px) {
  .chart-header { flex-direction: column; align-items: flex-start; }
  .chart-select { width: 100%; }
}
</style>
