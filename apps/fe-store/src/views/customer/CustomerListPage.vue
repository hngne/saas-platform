<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useAppToast } from '@/composables/useToast'
import { formatDate, formatNumber, formatVND } from '@/utils/format'
import {
  customerService,
  type Customer,
  type CustomerFilter,
  type CustomerStatus,
  type CustomerSummary,
} from '@/services/customer.service'

type PageToken = number | 'ellipsis'

const toast = useAppToast()
const loading = ref(true)
const customers = ref<Customer[]>([])
const totalRecords = ref(0)
const summary = ref<CustomerSummary>({
  total: 0,
  active: 0,
  banned: 0,
  new_this_month: 0,
})

const filter = ref<CustomerFilter>({
  page: 1,
  limit: 10,
  search: '',
  sort_by: 'created_at',
  sort_order: 'desc',
})

const confirmVisible = ref(false)
const confirmMessage = ref('')
const confirmSeverity = ref<'danger' | 'warn'>('warn')
const confirmAction = ref<(() => Promise<void>) | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / Number(filter.value.limit || 10))))

const statusOptions = [
  { label: 'Tất cả trạng thái', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Banned', value: 'BANNED' },
]

const sortOptions = [
  { label: 'Mới nhất', value: 'created_at:desc' },
  { label: 'Cũ nhất', value: 'created_at:asc' },
  { label: 'Tên A-Z', value: 'name:asc' },
  { label: 'Email A-Z', value: 'email:asc' },
]

const selectedSort = computed({
  get: () => `${filter.value.sort_by}:${filter.value.sort_order}`,
  set: (value: string) => {
    const [sortBy, sortOrder] = value.split(':')
    filter.value.sort_by = sortBy as CustomerFilter['sort_by']
    filter.value.sort_order = sortOrder as CustomerFilter['sort_order']
  },
})

const statCards = computed(() => [
  {
    label: 'Tổng người dùng',
    value: summary.value.total,
    badge: 'Tổng',
    tone: 'orange',
    icon: 'pi pi-users',
  },
  {
    label: 'Đang hoạt động',
    value: summary.value.active,
    badge: 'Active',
    tone: 'green',
    icon: 'pi pi-bolt',
  },
  {
    label: 'Bị khóa',
    value: summary.value.banned,
    badge: summary.value.banned ? 'Cần xử lý' : 'Ổn định',
    tone: 'red',
    icon: 'pi pi-ban',
  },
  {
    label: 'Người dùng mới',
    value: summary.value.new_this_month,
    badge: 'Tháng này',
    tone: 'gold',
    icon: 'pi pi-user-plus',
  },
])

const pageSummary = computed(() => {
  if (!customers.value.length) return `Hiển thị 0 - 0 trong số ${formatNumber(totalRecords.value)} người dùng`
  const page = Number(filter.value.page || 1)
  const limit = Number(filter.value.limit || customers.value.length)
  const start = (page - 1) * limit + 1
  const end = start + customers.value.length - 1
  return `Hiển thị ${formatNumber(start)} - ${formatNumber(end)} trong số ${formatNumber(totalRecords.value)} người dùng`
})

const paginationItems = computed<PageToken[]>(() => {
  const total = totalPages.value
  const current = Number(filter.value.page || 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)
  const result: PageToken[] = []

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1]
    if (previous && page - previous > 1) result.push('ellipsis')
    result.push(page)
  })

  return result
})

const getInitials = (name?: string | null, email?: string) => {
  const source = name?.trim() || email || 'ND'
  const parts = source.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'ND'
}

const statusLabel = (status: CustomerStatus) => {
  if (status === 'ACTIVE') return 'Active'
  if (status === 'BANNED') return 'Banned'
  return 'Inactive'
}

const fetchSummary = async () => {
  const { data } = await customerService.getSummary()
  summary.value = data.data
}

const fetchCustomers = async () => {
  loading.value = true
  try {
    const { data } = await customerService.getAll({
      ...filter.value,
      search: filter.value.search?.trim() || undefined,
    })
    const payload = data.data
    customers.value = payload.data || payload.items || []
    totalRecords.value = Number(payload.meta?.total ?? payload.total ?? customers.value.length)
  } catch {
    toast.error('Không thể tải danh sách người dùng')
  } finally {
    loading.value = false
  }
}

const fetchAll = async () => {
  try {
    await Promise.all([fetchSummary(), fetchCustomers()])
  } catch {
    toast.error('Không thể tải dữ liệu người dùng')
  }
}

const applyFilters = () => {
  filter.value.page = 1
  fetchAll()
}

const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(applyFilters, 350)
}

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === filter.value.page) return
  filter.value.page = page
  fetchCustomers()
}

const askConfirm = (message: string, severity: 'danger' | 'warn', action: () => Promise<void>) => {
  confirmMessage.value = message
  confirmSeverity.value = severity
  confirmAction.value = action
  confirmVisible.value = true
}

const runConfirm = async () => {
  if (!confirmAction.value) return
  try {
    await confirmAction.value()
  } finally {
    confirmAction.value = null
  }
}

const setStatus = (customer: Customer, status: CustomerStatus) => {
  askConfirm(
    `Cập nhật trạng thái của ${customer.name || customer.email} thành "${statusLabel(status)}"?`,
    status === 'ACTIVE' ? 'warn' : 'danger',
    async () => {
      try {
        await customerService.updateStatus(customer.id, status)
        toast.success('Đã cập nhật trạng thái người dùng')
        fetchAll()
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Cập nhật trạng thái thất bại')
      }
    },
  )
}

onMounted(fetchAll)
</script>

<template>
  <div class="customer-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">Quản lý người dùng</h1>
        <p class="page-subtitle">Theo dõi tài khoản khách hàng, trạng thái mua hàng và lịch sử tương tác.</p>
      </div>
      <Button label="Làm mới" icon="pi pi-refresh" class="refresh-btn" @click="fetchAll" />
    </section>

    <section class="stats-grid">
      <article v-for="card in statCards" :key="card.label" class="stat-card app-card" :class="`tone-${card.tone}`">
        <div class="stat-top">
          <div class="stat-icon"><i :class="card.icon"></i></div>
          <span class="stat-badge">{{ card.badge }}</span>
        </div>
        <span class="stat-label">{{ card.label }}</span>
        <strong>{{ formatNumber(card.value) }}</strong>
      </article>
    </section>

    <section class="filter-card app-card">
      <div class="filter-group search-group">
        <label>Tìm kiếm nâng cao</label>
        <div class="search-box">
          <i class="pi pi-search"></i>
          <InputText
            v-model="filter.search"
            placeholder="Tìm theo tên, email, số điện thoại..."
            @input="onSearchInput"
            @keyup.enter="applyFilters"
          />
        </div>
      </div>
      <div class="filter-group">
        <label>Trạng thái</label>
        <Select
          v-model="filter.status"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Tất cả trạng thái"
          @change="applyFilters"
        />
      </div>
      <div class="filter-group">
        <label>Sắp xếp</label>
        <Select
          v-model="selectedSort"
          :options="sortOptions"
          optionLabel="label"
          optionValue="value"
          @change="applyFilters"
        />
      </div>
      <Button label="Lọc kết quả" icon="pi pi-filter" class="btn-create-unified filter-submit" @click="applyFilters" />
    </section>

    <section class="table-card app-card">
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Đang tải người dùng...</span>
      </div>

      <EmptyState
        v-else-if="!customers.length"
        icon="pi pi-user"
        title="Chưa có người dùng"
        description="Không tìm thấy người dùng phù hợp với bộ lọc hiện tại."
      />

      <template v-else>
        <div class="table-wrap">
          <table class="customer-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Số điện thoại</th>
                <th>Trạng thái</th>
                <th>Đơn hàng</th>
                <th>Tổng chi tiêu</th>
                <th>Ngày tham gia</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="customer in customers" :key="customer.id">
                <td>
                  <div class="customer-cell">
                    <img v-if="customer.avatar_url" :src="customer.avatar_url" :alt="customer.name || customer.email" class="avatar image" />
                    <div v-else class="avatar">{{ getInitials(customer.name, customer.email) }}</div>
                    <div>
                      <strong>{{ customer.name || 'Chưa đặt tên' }}</strong>
                      <span>{{ customer.email }}</span>
                    </div>
                  </div>
                </td>
                <td class="phone-cell">{{ customer.phone || '—' }}</td>
                <td><span class="status-chip" :class="customer.status.toLowerCase()">{{ statusLabel(customer.status) }}</span></td>
                <td><strong>{{ formatNumber(customer.order_count || 0) }}</strong></td>
                <td class="spent-cell">{{ formatVND(customer.total_spent || 0) }}</td>
                <td>{{ formatDate(customer.created_at) }}</td>
                <td>
                  <div class="row-actions">
                    <button v-if="customer.status !== 'ACTIVE'" title="Kích hoạt" @click="setStatus(customer, 'ACTIVE')">
                      <i class="pi pi-check-circle"></i>
                    </button>
                    <button v-if="customer.status === 'ACTIVE'" title="Tạm dừng" @click="setStatus(customer, 'INACTIVE')">
                      <i class="pi pi-pause-circle"></i>
                    </button>
                    <button title="Cấm tài khoản" class="danger" @click="setStatus(customer, 'BANNED')">
                      <i class="pi pi-ban"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-footer">
          <span>{{ pageSummary }}</span>
          <div class="pagination">
            <button :disabled="filter.page === 1" @click="goToPage(Number(filter.page || 1) - 1)">
              <i class="pi pi-chevron-left"></i>
            </button>
            <template v-for="(item, index) in paginationItems" :key="`${item}-${index}`">
              <span v-if="item === 'ellipsis'" class="ellipsis">...</span>
              <button v-else :class="{ active: item === filter.page }" @click="goToPage(item)">
                {{ item }}
              </button>
            </template>
            <button :disabled="filter.page === totalPages" @click="goToPage(Number(filter.page || 1) + 1)">
              <i class="pi pi-chevron-right"></i>
            </button>
          </div>
        </div>
      </template>
    </section>

    <ConfirmDialog
      v-model:visible="confirmVisible"
      title="Xác nhận thao tác"
      :message="confirmMessage"
      :severity="confirmSeverity"
      @confirm="runConfirm"
    />
  </div>
</template>

<style scoped>
.customer-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.refresh-btn {
  height: 44px;
  border: 1px solid #fed7aa;
  color: var(--primary);
  background: #fff7ed;
  font-weight: 700;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.stat-card {
  min-height: 168px;
  padding: 24px;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-icon {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 1.15rem;
}

.stat-badge {
  padding: 6px 12px;
  border-radius: 999px;
  color: #047857;
  background: #ecfdf5;
  font-size: 0.75rem;
  font-weight: 800;
}

.stat-label {
  display: block;
  margin-top: 24px;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.stat-card strong {
  display: block;
  margin-top: 8px;
  color: #111827;
  font-size: 2.3rem;
  line-height: 1;
  font-weight: 800;
}

.tone-orange .stat-icon { color: var(--primary); background: #ffedd5; }
.tone-green .stat-icon { color: var(--success); background: #dcfce7; }
.tone-red .stat-icon { color: var(--danger); background: #fee2e2; }
.tone-gold .stat-icon { color: #b7791f; background: #fef3c7; }
.tone-red .stat-badge { color: #b91c1c; background: #fef2f2; }
.tone-gold .stat-badge { color: #92400e; background: #fef3c7; }

.filter-card {
  display: grid;
  grid-template-columns: minmax(280px, 1.7fr) minmax(180px, 0.75fr) minmax(180px, 0.75fr) auto;
  gap: 18px;
  align-items: end;
  padding: 24px;
  min-width: 0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.search-box {
  position: relative;
  min-width: 0;
}

.search-box i {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  z-index: 1;
}

.search-box :deep(.p-inputtext) {
  width: 100%;
  padding-left: 42px;
}

.filter-card :deep(.p-select),
.filter-card :deep(.p-inputtext) {
  width: 100%;
  height: 48px;
  background: #f4f6ff;
  border: 1px solid transparent;
}

.filter-submit {
  min-width: 190px;
}

.table-card {
  overflow: hidden;
}

.loading-state {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-muted);
}

.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.customer-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.customer-table th {
  padding: 18px 24px;
  background: #f6f7ff;
  color: #64748b;
  text-align: left;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.customer-table td {
  padding: 18px 24px;
  border-top: 1px solid #eef2f7;
  color: #111827;
  vertical-align: middle;
}

.customer-cell {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 250px;
}

.customer-cell strong,
.customer-cell span {
  display: block;
  max-width: 270px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customer-cell strong {
  font-weight: 800;
}

.customer-cell span {
  color: #64748b;
  font-size: 0.88rem;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: #fff;
  background: linear-gradient(135deg, #475569, #111827);
  font-weight: 800;
}

.avatar.image {
  object-fit: cover;
}

.phone-cell {
  white-space: pre-line;
}

.spent-cell {
  color: #ea580c;
  font-weight: 800;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 13px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.status-chip.active { color: #047857; background: #dcfce7; }
.status-chip.inactive { color: #475569; background: #f1f5f9; }
.status-chip.banned { color: #b91c1c; background: #fee2e2; }

.row-actions {
  display: flex;
  gap: 8px;
}

.row-actions button,
.pagination button {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #94a3b8;
  cursor: pointer;
}

.row-actions button {
  width: 34px;
  height: 34px;
  border-radius: 10px;
}

.row-actions button:hover {
  color: var(--primary);
  border-color: #fed7aa;
  background: #fff7ed;
}

.row-actions button.danger:hover {
  color: var(--danger);
  border-color: #fecaca;
  background: #fef2f2;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-top: 1px solid #eef2f7;
  color: #64748b;
  font-size: 0.9rem;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination button {
  min-width: 42px;
  height: 42px;
  border-radius: 10px;
  font-weight: 700;
}

.pagination button.active {
  color: #fff;
  border-color: var(--primary);
  background: var(--primary);
}

.pagination button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ellipsis {
  color: #64748b;
  padding: 0 4px;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-card {
    grid-template-columns: 1fr 1fr;
  }

  .filter-submit {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .stats-grid,
  .filter-card {
    grid-template-columns: 1fr;
  }

  .table-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .pagination {
    flex-wrap: wrap;
  }
}

@media (max-width: 560px) {
  .customer-table {
    min-width: 760px;
  }

  .filter-submit {
    min-width: 0;
    width: 100%;
  }
}
</style>
