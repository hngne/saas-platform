<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeService, type Store, type StoreFilter } from '@/services/store.service'
import { useAppToast } from '@/composables/useToast'
import { formatNumber } from '@/utils/format'
import StoreEditorDrawer from '@/components/store/StoreEditorDrawer.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'

const toast = useAppToast()

const loading = ref(true)
const stores = ref<Store[]>([])
const allStores = ref<Store[]>([])
const totalRecords = ref(0)
const filter = ref<StoreFilter>({
  page: 1,
  limit: 8,
  search: '',
})

const showDrawer = ref(false)
const editItem = ref<Store | null>(null)
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Store | null>(null)

const statCards = computed(() => {
  const active = allStores.value.filter((store) => store.is_active).length
  const inactive = allStores.value.length - active
  const provinces = new Set(allStores.value.map((store) => store.province).filter(Boolean)).size
  const hasCoordinates = allStores.value.filter((store) => store.latitude != null && store.longitude != null).length

  return [
    {
      label: 'Tổng cửa hàng',
      value: formatNumber(allStores.value.length),
      note: `${formatNumber(active)} cửa hàng đang hoạt động`,
      tone: 'neutral',
    },
    {
      label: 'Tạm ẩn',
      value: formatNumber(inactive),
      note: inactive > 0 ? 'Có điểm bán đang bị tắt khỏi vận hành' : 'Không có cửa hàng nào bị tắt',
      tone: 'neutral',
    },
    {
      label: 'Tỉnh thành phủ',
      value: formatNumber(provinces),
      note: provinces > 0 ? 'Dựa trên trường tỉnh / thành đã nhập' : 'Chưa có dữ liệu tỉnh / thành',
      tone: 'neutral',
    },
    {
      label: 'Có tọa độ map',
      value: formatNumber(hasCoordinates),
      note: hasCoordinates > 0 ? 'Sẵn sàng cho các tính năng bản đồ sau này' : 'Chưa gắn vị trí cho cửa hàng',
      tone: 'highlight',
    },
  ]
})

const fetchSummarySource = async () => {
  const pageSize = 100
  let page = 1
  let totalPages = 1
  const items: Store[] = []

  do {
    const { data } = await storeService.getAll({ page, limit: pageSize })
    const payload = data.data || {}
    const chunk = payload.data || payload.items || payload || []
    items.push(...chunk)
    totalPages = Number(payload.meta?.total_pages ?? payload.meta?.totalPages ?? 1)
    page += 1
  } while (page <= totalPages)

  return items
}

const fetchStores = async () => {
  loading.value = true
  try {
    const { data } = await storeService.getAll(filter.value)
    const payload = data.data || {}
    stores.value = payload.data || payload.items || payload || []
    totalRecords.value = Number(payload.meta?.total ?? payload.total ?? stores.value.length)
  } catch {
    toast.error('Không thể tải danh sách cửa hàng')
  } finally {
    loading.value = false
  }
}

const fetchSummary = async () => {
  allStores.value = await fetchSummarySource()
}

const fetchAll = async () => {
  try {
    await Promise.all([fetchSummary(), fetchStores()])
  } catch {
    toast.error('Không thể tải dữ liệu cửa hàng')
  }
}

const openCreate = () => {
  editItem.value = null
  showDrawer.value = true
}

const openEdit = (store: Store) => {
  editItem.value = { ...store }
  showDrawer.value = true
}

const toggleActive = async (store: Store) => {
  try {
    await storeService.toggleActive(store.id, !store.is_active)
    toast.success(store.is_active ? 'Đã tắt cửa hàng' : 'Đã kích hoạt cửa hàng')
    await fetchAll()
  } catch (error: any) {
    toast.error('Lỗi', error?.response?.data?.message || 'Không thể cập nhật trạng thái cửa hàng')
  }
}

const confirmDelete = (store: Store) => {
  deleteTarget.value = store
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return

  try {
    await storeService.delete(deleteTarget.value.id)
    toast.success('Đã xóa cửa hàng')
    await fetchAll()
  } catch (error: any) {
    toast.error('Lỗi', error?.response?.data?.message || 'Không thể xóa cửa hàng')
  }
}

onMounted(fetchAll)
</script>

<template>
  <div class="stores-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">Quản lý cửa hàng</h1>
        <p class="page-subtitle">Theo dõi các điểm bán, giờ mở cửa và trạng thái vận hành của merchant trong cùng một màn quản trị.</p>
      </div>

      <Button
        label="Thêm cửa hàng"
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

    <section class="stores-shell">
      <div class="toolbar-top">
        <div class="search-wrap">
          <i class="pi pi-search search-icon"></i>
          <InputText
            v-model="filter.search"
            class="stores-search"
            placeholder="Tìm theo tên cửa hàng hoặc địa chỉ..."
            @keyup.enter="fetchStores"
          />
        </div>

        <Button icon="pi pi-refresh" label="Làm mới" outlined class="refresh-btn" @click="fetchAll" />
      </div>

      <div class="table-card">
        <div class="table-head">
          <div>Tên cửa hàng</div>
          <div>Địa chỉ</div>
          <div>Liên hệ</div>
          <div>Giờ mở cửa</div>
          <div>Trạng thái</div>
          <div class="text-right">Thao tác</div>
        </div>

        <div v-if="loading" class="table-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <div v-else-if="!stores.length" class="empty-wrap">
          <EmptyState
            icon="pi pi-home"
            title="Chưa có cửa hàng"
            description="Tạo điểm bán đầu tiên để quản lý địa chỉ, giờ hoạt động và dữ liệu vận hành."
          >
            <div class="empty-actions">
              <Button label="Tạo cửa hàng" icon="pi pi-plus" class="btn-create-unified" @click="openCreate" />
            </div>
          </EmptyState>
        </div>

        <template v-else>
          <div
            v-for="store in stores"
            :key="store.id"
            class="store-row"
          >
            <div class="name-cell">
              <span class="mobile-label">Tên cửa hàng</span>
              <strong>{{ store.name }}</strong>
              <span>{{ store.province || 'Chưa gắn tỉnh / thành' }}</span>
            </div>

            <div class="address-cell">
              <span class="mobile-label">Địa chỉ</span>
              <strong>{{ store.address }}</strong>
              <span>{{ [store.ward, store.district, store.province].filter(Boolean).join(', ') || 'Chưa đầy đủ khu vực' }}</span>
            </div>

            <div class="contact-cell">
              <span class="mobile-label">Liên hệ</span>
              <strong>{{ store.phone || 'Chưa có số điện thoại' }}</strong>
              <span>{{ store.latitude != null && store.longitude != null ? 'Đã gắn tọa độ bản đồ' : 'Chưa gắn vị trí map' }}</span>
            </div>

            <div class="time-cell">
              <span class="mobile-label">Giờ mở cửa</span>
              <strong>{{ store.open_time || '--:--' }} - {{ store.close_time || '--:--' }}</strong>
            </div>

            <div class="status-cell">
              <span class="mobile-label">Trạng thái</span>
              <div class="status-stack">
                <span class="status-pill" :class="store.is_active ? 'status-active' : 'status-inactive'">
                  {{ store.is_active ? 'Đang hoạt động' : 'Tạm ẩn' }}
                </span>
                <span class="status-helper">
                  {{ store.is_active ? 'Có thể dùng trong quy trình vận hành' : 'Đang bị ẩn khỏi danh sách hoạt động' }}
                </span>
              </div>
              <ToggleSwitch :modelValue="store.is_active" @update:modelValue="toggleActive(store)" />
            </div>

            <div class="actions-cell">
              <button type="button" class="row-action" @click="openEdit(store)">Sửa</button>
              <button type="button" class="row-action danger" @click="confirmDelete(store)">Xóa</button>
            </div>
          </div>
        </template>
      </div>
    </section>

    <StoreEditorDrawer
      v-model:visible="showDrawer"
      :store="editItem"
      @saved="showDrawer = false; fetchAll()"
    />
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      message="Xóa cửa hàng này khỏi hệ thống?"
      severity="danger"
      confirmLabel="Xóa"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.stores-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stores-shell {
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

.stores-shell {
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

.stores-search {
  width: 100%;
  height: 52px;
  padding-left: 44px;
  border-radius: 18px;
  border-color: #e2e8f0;
  background: #f8fbff;
}

.refresh-btn {
  min-height: 44px;
}

.table-card {
  border-radius: 26px;
  background: #fff;
  border: 1px solid #edf2f7;
  overflow: hidden;
}

.table-head,
.store-row {
  display: grid;
  grid-template-columns: 1.2fr 1.5fr 1.1fr 1fr 1.45fr 0.9fr;
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

.store-row {
  padding: 24px;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
}

.store-row:last-child {
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
.address-cell,
.contact-cell,
.time-cell,
.status-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.name-cell strong,
.address-cell strong,
.contact-cell strong,
.time-cell strong {
  color: #0f172a;
  font-size: 0.98rem;
}

.name-cell span,
.address-cell span,
.contact-cell span,
.time-cell span,
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

  .store-row {
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
  .toolbar-top {
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

  .store-row {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .stores-shell {
    padding: 20px;
  }
}

@media (max-width: 560px) {
  .stores-page {
    gap: 18px;
  }

  .stores-shell,
  .stat-card {
    border-radius: 22px;
  }
}
</style>
