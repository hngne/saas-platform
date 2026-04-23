<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useAppToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth.store'
import { formatDate, formatNumber } from '@/utils/format'
import {
  staffService,
  type CreateStaffPayload,
  type StaffFilter,
  type StaffMember,
  type StaffRole,
  type StaffStatus,
  type StaffSummary,
} from '@/services/staff.service'

type PageToken = number | 'ellipsis'

const toast = useAppToast()
const authStore = useAuthStore()

const loading = ref(true)
const submitting = ref(false)
const staff = ref<StaffMember[]>([])
const totalRecords = ref(0)
const summary = ref<StaffSummary>({
  total: 0,
  active: 0,
  blocked: 0,
  owners: 0,
})

const filter = ref<StaffFilter>({
  page: 1,
  limit: 10,
  search: '',
  sort_by: 'created_at',
  sort_order: 'desc',
})

const createDialogVisible = ref(false)
const confirmVisible = ref(false)
const confirmMessage = ref('')
const confirmSeverity = ref<'danger' | 'warn'>('warn')
const confirmAction = ref<(() => Promise<void>) | null>(null)
const form = ref<CreateStaffPayload>({
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'STAFF',
  status: 'ACTIVE',
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

const isOwner = computed(() => authStore.user?.role === 'OWNER')
const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / Number(filter.value.limit || 10))))
const canManageMember = (member: StaffMember) =>
  isOwner.value && member.role !== 'OWNER' && member.id !== authStore.user?.id

const roleOptions = [
  { label: 'Tất cả vai trò', value: undefined },
  { label: 'OWNER', value: 'OWNER' },
  { label: 'STAFF', value: 'STAFF' },
]

const createRoleOptions = [
  { label: 'STAFF', value: 'STAFF' },
]

const statusOptions = [
  { label: 'Tất cả trạng thái', value: undefined },
  { label: 'Đang hoạt động', value: 'ACTIVE' },
  { label: 'Tạm dừng', value: 'INACTIVE' },
  { label: 'Bị cấm', value: 'BANNED' },
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
    filter.value.sort_by = sortBy as StaffFilter['sort_by']
    filter.value.sort_order = sortOrder as StaffFilter['sort_order']
  },
})

const statCards = computed(() => [
  {
    label: 'Tổng nhân viên',
    value: summary.value.total,
    hint: `${formatNumber(summary.value.total)} tài khoản`,
    tone: 'orange',
    icon: 'pi pi-users',
  },
  {
    label: 'Đang hoạt động',
    value: summary.value.active,
    hint: summary.value.total ? `${Math.round((summary.value.active / summary.value.total) * 100)}% tỷ lệ` : 'Chưa có dữ liệu',
    tone: 'green',
    icon: 'pi pi-check-circle',
  },
  {
    label: 'Tạm khóa / Bị cấm',
    value: summary.value.blocked,
    hint: summary.value.blocked ? 'Cần xem xét' : 'Không có cảnh báo',
    tone: 'red',
    icon: 'pi pi-ban',
  },
  {
    label: 'Chủ cửa hàng / Quản lý',
    value: summary.value.owners,
    hint: 'Quyền tối cao',
    tone: 'gold',
    icon: 'pi pi-shield',
  },
])

const pageSummary = computed(() => {
  if (!staff.value.length) return `Hiển thị 0 - 0 của ${formatNumber(totalRecords.value)} nhân viên`
  const page = Number(filter.value.page || 1)
  const limit = Number(filter.value.limit || staff.value.length)
  const start = (page - 1) * limit + 1
  const end = start + staff.value.length - 1
  return `Hiển thị ${formatNumber(start)} - ${formatNumber(end)} của ${formatNumber(totalRecords.value)} nhân viên`
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
  const source = name?.trim() || email || 'NV'
  const parts = source.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'NV'
}

const roleLabel = (role: StaffRole) => (role === 'OWNER' ? 'OWNER' : 'STAFF')
const statusLabel = (status: StaffStatus) => {
  if (status === 'ACTIVE') return 'Đang hoạt động'
  if (status === 'BANNED') return 'Bị cấm'
  return 'Tạm dừng'
}

const fetchSummary = async () => {
  const { data } = await staffService.getSummary()
  summary.value = data.data
}

const fetchStaff = async () => {
  loading.value = true
  try {
    const { data } = await staffService.getAll({
      ...filter.value,
      search: filter.value.search?.trim() || undefined,
    })
    const payload = data.data
    staff.value = payload.data || payload.items || []
    totalRecords.value = Number(payload.meta?.total ?? payload.total ?? staff.value.length)
  } catch {
    toast.error('Không thể tải danh sách nhân viên')
  } finally {
    loading.value = false
  }
}

const fetchAll = async () => {
  try {
    await Promise.all([fetchSummary(), fetchStaff()])
  } catch {
    toast.error('Không thể tải dữ liệu nhân viên')
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
  fetchStaff()
}

const openCreate = () => {
  form.value = {
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'STAFF',
    status: 'ACTIVE',
  }
  createDialogVisible.value = true
}

const createStaff = async () => {
  submitting.value = true
  try {
    await staffService.create({
      ...form.value,
      phone: form.value.phone?.trim() || null,
    })
    toast.success('Đã tạo tài khoản nhân viên')
    createDialogVisible.value = false
    fetchAll()
  } catch (error: any) {
    toast.error(error?.response?.data?.message || 'Tạo nhân viên thất bại')
  } finally {
    submitting.value = false
  }
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

const setStatus = (member: StaffMember, status: StaffStatus) => {
  askConfirm(
    `Cập nhật trạng thái của ${member.name || member.email} thành "${statusLabel(status)}"?`,
    status === 'ACTIVE' ? 'warn' : 'danger',
    async () => {
      try {
        await staffService.updateStatus(member.id, status)
        toast.success('Đã cập nhật trạng thái nhân viên')
        fetchAll()
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Cập nhật trạng thái thất bại')
      }
    },
  )
}

const deleteStaff = (member: StaffMember) => {
  askConfirm(
    `Xóa tài khoản ${member.name || member.email}? Hành động này sẽ ẩn nhân viên khỏi danh sách.`,
    'danger',
    async () => {
      try {
        await staffService.delete(member.id)
        toast.success('Đã xóa nhân viên')
        fetchAll()
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Xóa nhân viên thất bại')
      }
    },
  )
}

onMounted(fetchAll)
</script>

<template>
  <div class="staff-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">Quản lý nhân viên</h1>
        <p class="page-subtitle">Quản lý tài khoản nhân viên, vai trò và trạng thái hoạt động trong cửa hàng.</p>
      </div>
      <Button
        v-if="isOwner"
        label="Thêm nhân viên"
        icon="pi pi-plus"
        class="btn-create-unified"
        @click="openCreate"
      />
    </section>

    <section class="stats-grid">
      <article v-for="card in statCards" :key="card.label" class="stat-card app-card" :class="`tone-${card.tone}`">
        <div class="stat-icon"><i :class="card.icon"></i></div>
        <span>{{ card.label }}</span>
        <strong>{{ formatNumber(card.value) }}</strong>
        <small>{{ card.hint }}</small>
      </article>
    </section>

    <section class="filter-card app-card">
      <div class="filter-group search-group">
        <label>Tìm kiếm nhân viên</label>
        <div class="search-box">
          <i class="pi pi-search"></i>
          <InputText
            v-model="filter.search"
            placeholder="Tên, Email hoặc Số điện thoại..."
            @input="onSearchInput"
            @keyup.enter="applyFilters"
          />
        </div>
      </div>
      <div class="filter-group">
        <label>Vai trò</label>
        <Select
          v-model="filter.role"
          :options="roleOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Tất cả vai trò"
          @change="applyFilters"
        />
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
      <Button icon="pi pi-refresh" class="filter-button" aria-label="Làm mới" @click="fetchAll" />
    </section>

    <section class="table-card app-card">
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Đang tải nhân viên...</span>
      </div>

      <EmptyState
        v-else-if="!staff.length"
        icon="pi pi-users"
        title="Chưa có nhân viên"
        description="Không tìm thấy nhân viên phù hợp với bộ lọc hiện tại."
      />

      <template v-else>
        <div class="table-wrap">
          <table class="staff-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th v-if="isOwner">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in staff" :key="member.id">
                <td>
                  <div class="member-cell">
                    <div class="avatar" :class="{ online: member.status === 'ACTIVE' }">
                      {{ getInitials(member.name, member.email) }}
                    </div>
                    <div>
                      <strong>{{ member.name || 'Chưa đặt tên' }}</strong>
                      <span>{{ member.email }}</span>
                    </div>
                  </div>
                </td>
                <td class="phone-cell">{{ member.phone || '-' }}</td>
                <td><span class="role-chip" :class="member.role.toLowerCase()">{{ roleLabel(member.role) }}</span></td>
                <td><span class="status-chip" :class="member.status.toLowerCase()">{{ statusLabel(member.status) }}</span></td>
                <td>{{ formatDate(member.created_at) }}</td>
                <td v-if="isOwner">
                  <div v-if="canManageMember(member)" class="row-actions">
                    <button
                      v-if="member.status !== 'ACTIVE'"
                      title="Kích hoạt"
                      @click="setStatus(member, 'ACTIVE')"
                    >
                      <i class="pi pi-check-circle"></i>
                    </button>
                    <button
                      v-if="member.status === 'ACTIVE'"
                      title="Tạm dừng"
                      @click="setStatus(member, 'INACTIVE')"
                    >
                      <i class="pi pi-pause-circle"></i>
                    </button>
                    <button title="Cấm tài khoản" class="danger" @click="setStatus(member, 'BANNED')">
                      <i class="pi pi-ban"></i>
                    </button>
                    <button title="Xóa" class="danger" @click="deleteStaff(member)">
                      <i class="pi pi-trash"></i>
                    </button>
                  </div>
                  <span v-else class="locked-action">Không thể thao tác</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="staff-card-list">
          <article v-for="member in staff" :key="`card-${member.id}`" class="staff-mobile-card">
            <div class="staff-card-main">
              <div class="avatar" :class="{ online: member.status === 'ACTIVE' }">
                {{ getInitials(member.name, member.email) }}
              </div>
              <div class="staff-card-copy">
                <strong>{{ member.name || 'Chưa đặt tên' }}</strong>
                <span>{{ member.email }}</span>
              </div>
            </div>

            <div class="staff-card-meta">
              <div>
                <small>Số điện thoại</small>
                <strong>{{ member.phone || '-' }}</strong>
              </div>
              <div>
                <small>Ngày tạo</small>
                <strong>{{ formatDate(member.created_at) }}</strong>
              </div>
            </div>

            <div class="staff-card-badges">
              <span class="role-chip" :class="member.role.toLowerCase()">{{ roleLabel(member.role) }}</span>
              <span class="status-chip" :class="member.status.toLowerCase()">{{ statusLabel(member.status) }}</span>
            </div>

            <div v-if="isOwner" class="staff-card-actions">
              <template v-if="canManageMember(member)">
                <button v-if="member.status !== 'ACTIVE'" class="mobile-action" @click="setStatus(member, 'ACTIVE')">
                  <i class="pi pi-check-circle"></i>
                  Kích hoạt
                </button>
                <button v-if="member.status === 'ACTIVE'" class="mobile-action" @click="setStatus(member, 'INACTIVE')">
                  <i class="pi pi-pause-circle"></i>
                  Tạm dừng
                </button>
                <button class="mobile-action danger" @click="setStatus(member, 'BANNED')">
                  <i class="pi pi-ban"></i>
                  Cấm
                </button>
                <button class="mobile-action danger" @click="deleteStaff(member)">
                  <i class="pi pi-trash"></i>
                  Xóa
                </button>
              </template>
              <span v-else class="locked-action">Tài khoản OWNER/hiện tại không thể thao tác</span>
            </div>
          </article>
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

    <Dialog v-model:visible="createDialogVisible" modal :showHeader="false" :style="{ width: '560px' }" class="staff-dialog">
      <form class="staff-form" @submit.prevent="createStaff">
        <div class="form-hero">
          <div class="form-hero-icon">
            <i class="pi pi-user-plus"></i>
          </div>
          <div>
            <h2>Tạo tài khoản nhân viên</h2>
            <p>Thiết lập quyền truy cập và trạng thái đăng nhập cho nhân viên mới.</p>
          </div>
        </div>

        <div class="form-grid">
          <label>
            Họ tên
            <span class="field-wrap">
              <i class="pi pi-user"></i>
              <InputText v-model="form.name" required autocomplete="off" placeholder="Nhập tên nhân viên" />
            </span>
          </label>
          <label>
            Số điện thoại
            <span class="field-wrap">
              <i class="pi pi-phone"></i>
              <InputText v-model="form.phone" autocomplete="off" placeholder="090 123 4567" />
            </span>
          </label>
        </div>

        <label>
          Email
          <span class="field-wrap">
            <i class="pi pi-envelope"></i>
            <InputText v-model="form.email" required type="email" autocomplete="off" placeholder="name@shopflow.com" />
          </span>
        </label>

        <label>
          Mật khẩu
          <span class="field-wrap">
            <i class="pi pi-lock"></i>
            <InputText v-model="form.password" required type="password" autocomplete="new-password" placeholder="Tối thiểu 6 ký tự" />
          </span>
        </label>

        <div class="form-grid">
          <label>
            Vai trò
            <Select v-model="form.role" :options="createRoleOptions" optionLabel="label" optionValue="value" />
          </label>
          <label>
            Trạng thái
            <Select v-model="form.status" :options="statusOptions.slice(1)" optionLabel="label" optionValue="value" />
          </label>
        </div>

        <div class="dialog-actions">
          <Button label="Hủy" severity="secondary" outlined type="button" @click="createDialogVisible = false" />
          <Button label="Tạo tài khoản" icon="pi pi-plus" class="btn-primary" type="submit" :loading="submitting" />
        </div>
      </form>
    </Dialog>
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
.staff-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.page-title {
  font-size: var(--page-title-size);
  line-height: 1.15;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: var(--page-title-letter-spacing);
}

.page-subtitle {
  margin-top: 8px;
  color: #4b5563;
  font-size: var(--page-subtitle-size);
  line-height: var(--page-subtitle-line-height);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.stat-card {
  position: relative;
  min-height: 138px;
  padding: 24px;
}

.stat-card span {
  display: block;
  margin-top: 12px;
  color: #4b5563;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.stat-card strong {
  display: block;
  margin-top: 8px;
  color: #111827;
  font-size: 2.25rem;
  line-height: 1;
  font-weight: 800;
}

.stat-card small {
  display: block;
  margin-top: 8px;
  color: var(--text-muted);
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

.tone-orange .stat-icon { color: var(--primary); background: #fff3ed; }
.tone-green .stat-icon { color: var(--success); background: #dcfce7; }
.tone-red .stat-icon { color: var(--danger); background: #fee2e2; }
.tone-gold .stat-icon { color: #b7791f; background: #fef3c7; }

.filter-card {
  display: grid;
  grid-template-columns: minmax(260px, 1.6fr) minmax(160px, 0.7fr) minmax(180px, 0.8fr) minmax(160px, 0.7fr) 56px;
  gap: 18px;
  align-items: end;
  padding: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label,
.staff-form label {
  color: #4b5563;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.search-box {
  position: relative;
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
.filter-card :deep(.p-inputtext),
.staff-form :deep(.p-select),
.staff-form :deep(.p-inputtext) {
  width: 100%;
  height: 48px;
  background: #f4f6ff;
  border: 1px solid transparent;
}

.filter-button {
  width: 56px;
  height: 48px;
  border: none;
  color: #111827;
  background: #eef2ff;
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
}

.staff-card-list {
  display: none;
}

.staff-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 920px;
}

.staff-table th {
  padding: 18px 24px;
  background: #f6f7ff;
  color: #4b5563;
  text-align: left;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.staff-table td {
  padding: 18px 24px;
  border-top: 1px solid #eef2f7;
  color: #111827;
  vertical-align: middle;
}

.member-cell {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 240px;
}

.member-cell strong,
.member-cell span {
  display: block;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-cell strong {
  font-weight: 800;
}

.member-cell span {
  color: #64748b;
  font-size: 0.88rem;
}

.avatar {
  position: relative;
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

.avatar::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 2px;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #94a3b8;
}

.avatar.online::after {
  background: #22c55e;
}

.phone-cell {
  white-space: pre-line;
}

.role-chip,
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 13px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.role-chip.owner { color: #422006; background: #fef3c7; }
.role-chip.staff { color: #3730a3; background: #eef2ff; }
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
  color: #64748b;
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

.locked-action {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  color: #94a3b8;
  background: #f8fafc;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
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

.staff-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 2px 2px;
}

.form-hero {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, #fff7ed, #fff);
  border: 1px solid #fed7aa;
}

.form-hero-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--gold));
  box-shadow: 0 10px 22px rgba(255, 107, 43, 0.24);
}

.form-hero h2 {
  color: #111827;
  font-size: 1.12rem;
  line-height: 1.25;
  font-weight: 800;
}

.form-hero p {
  margin-top: 4px;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.55;
}

.staff-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.field-wrap {
  position: relative;
  display: block;
}

.field-wrap > i {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  z-index: 1;
}

.field-wrap :deep(.p-inputtext) {
  padding-left: 42px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-card {
    grid-template-columns: 1fr 1fr;
  }

  .search-group,
  .filter-button {
    grid-column: auto;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }

  .page-title {
    font-size: var(--page-title-mobile-size);
  }

  .stats-grid,
  .filter-card,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .filter-button {
    width: 100%;
  }

  .table-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .table-wrap {
    display: none;
  }

  .staff-card-list {
    display: grid;
    gap: 14px;
    padding: 16px;
  }

  .staff-mobile-card {
    padding: 16px;
    border: 1px solid #eef2f7;
    border-radius: 16px;
    background: #fff;
  }

  .staff-card-main {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .staff-card-copy {
    min-width: 0;
  }

  .staff-card-copy strong,
  .staff-card-copy span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .staff-card-copy strong {
    color: #111827;
    font-weight: 800;
  }

  .staff-card-copy span {
    color: #64748b;
    font-size: 0.86rem;
  }

  .staff-card-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 16px;
  }

  .staff-card-meta div {
    min-width: 0;
    padding: 12px;
    border-radius: 12px;
    background: #f8fafc;
  }

  .staff-card-meta small,
  .staff-card-meta strong {
    display: block;
  }

  .staff-card-meta small {
    color: #94a3b8;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .staff-card-meta strong {
    margin-top: 4px;
    color: #111827;
    font-weight: 800;
  }

  .staff-card-badges,
  .staff-card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }

  .mobile-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 38px;
    padding: 0 12px;
    border: 1px solid #fed7aa;
    border-radius: 10px;
    color: var(--primary);
    background: #fff7ed;
    font-weight: 800;
  }

  .mobile-action.danger {
    color: var(--danger);
    border-color: #fecaca;
    background: #fef2f2;
  }
}

@media (max-width: 560px) {
  .staff-card-meta,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-hero {
    flex-direction: column;
  }
}
</style>
