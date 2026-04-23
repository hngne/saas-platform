<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { shippingService, type ShippingMethod, type ShippingMethodType } from '@/services/shipping.service'
import { useAppToast } from '@/composables/useToast'
import { formatNumber, formatVND } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ShippingFormModal from '@/components/shipping/ShippingFormModal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import Select from 'primevue/select'

const authStore = useAuthStore()
const toast = useAppToast()

const loading = ref(true)
const methods = ref<ShippingMethod[]>([])
const search = ref('')
const typeFilter = ref<'ALL' | ShippingMethodType>('ALL')
const statusFilter = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
const showForm = ref(false)
const editItem = ref<ShippingMethod | null>(null)
const showDeleteConfirm = ref(false)
const deleteTarget = ref<ShippingMethod | null>(null)

const typeOptions = [
  { label: 'Tất cả loại', value: 'ALL' as const },
  { label: 'Giao hàng', value: 'DELIVERY' as const },
  { label: 'Nhận tại shop', value: 'PICKUP' as const },
]

const statusOptions = [
  { label: 'Tất cả trạng thái', value: 'ALL' as const },
  { label: 'Đang hoạt động', value: 'ACTIVE' as const },
  { label: 'Tạm ẩn', value: 'INACTIVE' as const },
]

const fetchAll = async () => {
  loading.value = true
  try {
    const { data } = await shippingService.getAll()
    methods.value = data.data || []
  } catch {
    toast.error('Không thể tải phương thức vận chuyển')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editItem.value = null
  showForm.value = true
}

const openEdit = (method: ShippingMethod) => {
  editItem.value = { ...method }
  showForm.value = true
}

const toggleActive = async (method: ShippingMethod) => {
  try {
    await shippingService.toggleActive(method.id, !method.is_active)
    method.is_active = !method.is_active
    toast.success(method.is_active ? 'Đã kích hoạt phương thức' : 'Đã tạm ẩn phương thức')
  } catch {
    toast.error('Cập nhật trạng thái thất bại')
  }
}

const confirmDelete = (method: ShippingMethod) => {
  deleteTarget.value = method
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return

  try {
    await shippingService.delete(deleteTarget.value.id)
    toast.success('Đã xóa phương thức vận chuyển')
    await fetchAll()
  } catch {
    toast.error('Xóa phương thức vận chuyển thất bại')
  }
}

const normalizeName = (value: string) => value.trim().toLowerCase()

const filteredMethods = computed(() => {
  const keyword = normalizeName(search.value)

  return methods.value.filter((method) => {
    const matchesSearch = !keyword || normalizeName(method.name).includes(keyword)
    const matchesType = typeFilter.value === 'ALL' || method.type === typeFilter.value
    const matchesStatus =
      statusFilter.value === 'ALL'
      || (statusFilter.value === 'ACTIVE' && method.is_active)
      || (statusFilter.value === 'INACTIVE' && !method.is_active)

    return matchesSearch && matchesType && matchesStatus
  })
})

const activeMethods = computed(() => methods.value.filter((method) => method.is_active))
const activeCarriers = computed(() => activeMethods.value.length)
const deliveryMethods = computed(() => methods.value.filter((method) => method.type === 'DELIVERY'))
const pickupMethods = computed(() => methods.value.filter((method) => method.type === 'PICKUP'))
const avgDeliveryTime = computed(() => {
  const values = activeMethods.value
    .filter((method) => method.type === 'DELIVERY' && method.estimated_days)
    .map((method) => Number(method.estimated_days || 0))

  if (!values.length) return null
  const total = values.reduce((sum, value) => sum + value, 0)
  return Number((total / values.length).toFixed(1))
})
const avgFee = computed(() => {
  const values = activeMethods.value.map((method) => Number(method.fee || 0))
  if (!values.length) return 0
  const total = values.reduce((sum, value) => sum + value, 0)
  return Math.round(total / values.length)
})

const pricingTip = computed(() => {
  if (!pickupMethods.value.length) {
    return 'Shop chưa bật phương thức nhận tại cửa hàng. Nếu có khách nội thành hoặc khách quen, bật pickup sẽ giúp giảm rào cản phí ship.'
  }

  if (avgFee.value > 40000) {
    return 'Phí ship trung bình của shop đang khá cao. Nên giữ ít nhất một phương thức tiêu chuẩn dưới 40.000 đ để tăng tỉ lệ hoàn tất đơn.'
  }

  return 'Cấu hình phí vận chuyển hiện tại đang khá hợp lý. Giữ tối thiểu một lựa chọn rẻ và một lựa chọn nhanh sẽ giúp khách dễ chốt đơn hơn.'
})

const getMethodMeta = (method: ShippingMethod) => {
  const normalized = normalizeName(method.name)

  if (method.type === 'PICKUP') {
    return {
      icon: 'pi pi-map-marker',
      subtitle: 'Khách đến shop lấy hàng',
      iconTone: 'tone-pickup',
      etaTone: 'eta-pickup',
    }
  }

  if (normalized.includes('express') || normalized.includes('nhanh') || Number(method.estimated_days || 0) <= 1) {
    return {
      icon: 'pi pi-bolt',
      subtitle: 'Tuyến ưu tiên giao nhanh',
      iconTone: 'tone-fast',
      etaTone: 'eta-fast',
    }
  }

  if (normalized.includes('bulk') || normalized.includes('freight') || Number(method.fee || 0) >= 100000) {
    return {
      icon: 'pi pi-box',
      subtitle: 'Phù hợp đơn cồng kềnh hoặc giá trị cao',
      iconTone: 'tone-heavy',
      etaTone: 'eta-heavy',
    }
  }

  return {
    icon: 'pi pi-truck',
    subtitle: 'Giao tiêu chuẩn cho đa số đơn hàng',
    iconTone: 'tone-standard',
    etaTone: 'eta-standard',
  }
}

const getEtaLabel = (method: ShippingMethod) => {
  if (method.type === 'PICKUP') return 'Tại cửa hàng'
  if (!method.estimated_days) return 'Chưa đặt'
  if (method.estimated_days <= 1) return '1 ngày'
  return `${method.estimated_days} ngày`
}

const getMethodTypeLabel = (type: ShippingMethodType) =>
  type === 'PICKUP' ? 'Nhận tại shop' : 'Giao hàng'

onMounted(fetchAll)
</script>

<template>
  <div class="shipping-page">
    <section class="page-header shipping-page-header">
      <div>
        <h1 class="page-title">Quản lý phương thức vận chuyển</h1>
        <p class="page-subtitle">
          Cấu hình phương thức vận chuyển cho <strong>{{ authStore.tenant?.store_name || 'shop hiện tại' }}</strong>.
          Màn này đang hoạt động theo từng shop vì dữ liệu shipping được lưu riêng theo tenant.
        </p>
      </div>

      <div class="shipping-header-actions">
        <div class="hero-search">
          <i class="pi pi-search"></i>
          <input
            v-model="search"
            type="text"
            placeholder="Tìm tên phương thức..."
          />
        </div>

        <Button
          label="Thêm phương thức"
          icon="pi pi-plus"
          class="btn-create-unified"
          @click="openCreate"
        />
      </div>
    </section>

    <section class="stats-grid">
      <article class="stat-card app-card">
        <span class="stat-label">PHƯƠNG THỨC ĐANG BẬT</span>
        <strong class="stat-value">{{ formatNumber(activeCarriers) }}</strong>
        <span class="stat-note">{{ formatNumber(methods.length) }} phương thức đang cấu hình cho shop</span>
      </article>

      <article class="stat-card app-card">
        <span class="stat-label">THỜI GIAN GIAO TB</span>
        <strong class="stat-value">
          {{ avgDeliveryTime ?? '—' }}
          <small v-if="avgDeliveryTime !== null">ngày</small>
        </strong>
        <span class="stat-note">{{ deliveryMethods.length ? 'Tính trên các phương thức giao hàng đang bật' : 'Chưa có đủ dữ liệu giao hàng' }}</span>
      </article>

      <article class="stat-card app-card">
        <span class="stat-label">PHẠM VI PHỤC VỤ</span>
        <strong class="stat-value">{{ pickupMethods.length ? 'Linh hoạt' : 'Giao hàng' }}</strong>
        <span class="stat-note">
          {{ pickupMethods.length ? 'Shop đang có cả giao hàng và nhận tại cửa hàng' : 'Shop hiện chỉ cấu hình giao hàng' }}
        </span>
      </article>

      <article class="stat-card app-card">
        <span class="stat-label">PHÍ SHIP TRUNG BÌNH</span>
        <strong class="stat-value">{{ formatVND(avgFee) }}</strong>
        <span class="stat-note">Mức phí trung bình của các phương thức đang hoạt động</span>
      </article>
    </section>

    <section class="toolbar-card app-card">
      <div class="toolbar-group">
        <div class="toolbar-field">
          <label>LOẠI PHƯƠNG THỨC</label>
          <Select
            v-model="typeFilter"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            class="toolbar-select"
          />
        </div>

        <div class="toolbar-field">
          <label>TRẠNG THÁI</label>
          <Select
            v-model="statusFilter"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            class="toolbar-select"
          />
        </div>
      </div>

      <div class="toolbar-summary">
        <span>{{ formatNumber(filteredMethods.length) }} phương thức khớp bộ lọc</span>
      </div>
    </section>

    <section class="methods-card app-card">
      <div class="methods-head">
        <div>
          <h2 class="methods-title">Phương thức đã cấu hình</h2>
          <p class="methods-subtitle">Quản lý các lựa chọn ship mà khách nhìn thấy ở bước checkout.</p>
        </div>
      </div>

      <div v-if="loading" class="table-loading">
        <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem; color: var(--primary)"></i>
      </div>

      <template v-else-if="filteredMethods.length">
        <div class="methods-table-head">
          <span>Tên phương thức</span>
          <span>Loại</span>
          <span>Phí (VND)</span>
          <span>Dự kiến</span>
          <span>Trạng thái</span>
          <span>Thao tác</span>
        </div>

        <div
          v-for="method in filteredMethods"
          :key="method.id"
          class="method-row"
        >
          <div class="method-identity">
            <div class="method-icon" :class="getMethodMeta(method).iconTone">
              <i :class="getMethodMeta(method).icon"></i>
            </div>

            <div class="method-copy">
              <strong>{{ method.name }}</strong>
              <span>{{ getMethodMeta(method).subtitle }}</span>
            </div>
          </div>

          <div class="method-type">
            <span class="type-chip" :class="method.type === 'PICKUP' ? 'type-pickup' : 'type-delivery'">
              {{ getMethodTypeLabel(method.type) }}
            </span>
          </div>

          <div class="method-fee">
            <strong>{{ formatVND(method.fee) }}</strong>
          </div>

          <div class="method-eta">
            <span class="eta-pill" :class="getMethodMeta(method).etaTone">
              {{ getEtaLabel(method) }}
            </span>
          </div>

          <div class="method-status">
            <ToggleSwitch :modelValue="method.is_active" @update:modelValue="toggleActive(method)" />
          </div>

          <div class="method-actions">
            <button type="button" class="action-btn" @click="openEdit(method)">Sửa</button>
            <button type="button" class="action-btn action-delete" @click="confirmDelete(method)">Xóa</button>
          </div>
        </div>
      </template>

      <div v-else class="empty-wrap">
        <EmptyState icon="pi pi-truck" title="Chưa có phương thức vận chuyển phù hợp" />
      </div>
    </section>

    <section class="tip-card">
      <div class="tip-icon">
        <i class="pi pi-info-circle"></i>
      </div>
      <div class="tip-copy">
        <strong>Gợi ý tối ưu phí ship</strong>
        <p>{{ pricingTip }}</p>
      </div>
    </section>

    <ShippingFormModal
      v-model:visible="showForm"
      :shipping="editItem"
      @saved="showForm = false; fetchAll()"
    />
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      message="Xóa phương thức vận chuyển này?"
      severity="danger"
      confirmLabel="Xóa"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.shipping-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.shipping-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 420px;
}

.shipping-header-actions .hero-search {
  flex: 1;
  min-width: 240px;
}

.hero-search {
  position: relative;
}

.hero-search i {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  color: var(--text-light);
}

.hero-search input {
  width: 100%;
  height: 52px;
  border-radius: 16px;
  border: 1px solid #e7ecf3;
  background: #f8fafc;
  padding: 0 16px 0 42px;
  outline: none;
  transition: all 0.2s ease;
}

.hero-search input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255, 107, 43, 0.08);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.stat-value {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #111827;
}

.stat-value small {
  margin-left: 6px;
  font-size: 1rem;
  color: #94a3b8;
}

.stat-note {
  color: var(--text-muted);
  line-height: 1.6;
}

.toolbar-card {
  padding: 18px 20px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.toolbar-group {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.toolbar-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 220px;
}

.toolbar-field label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.toolbar-select {
  width: 100%;
}

.toolbar-summary {
  color: var(--text-muted);
  font-weight: 600;
}

.methods-card {
  overflow: hidden;
}

.methods-head {
  padding: 24px 24px 12px;
}

.methods-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #101828;
}

.methods-subtitle {
  margin-top: 6px;
  color: var(--text-muted);
}

.methods-table-head,
.method-row {
  display: grid;
  grid-template-columns: minmax(260px, 2.2fr) 140px 150px 160px 110px 140px;
  gap: 12px;
  align-items: center;
  padding: 18px 24px;
}

.methods-table-head {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
  background: #f8fafc;
}

.method-row {
  border-top: 1px solid #eef2f7;
  transition: background 0.2s ease;
}

.method-row:hover {
  background: #fffaf6;
}

.method-identity {
  display: flex;
  align-items: center;
  gap: 14px;
}

.method-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.tone-fast {
  background: #fff4eb;
  color: #c2410c;
}

.tone-standard {
  background: #eef4ff;
  color: #1d4ed8;
}

.tone-heavy {
  background: #fff7ed;
  color: #9a3412;
}

.tone-pickup {
  background: #ecfeff;
  color: #0f766e;
}

.method-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.method-copy strong {
  font-size: 1rem;
  font-weight: 800;
  color: #111827;
}

.method-copy span {
  color: var(--text-muted);
  line-height: 1.5;
}

.type-chip,
.eta-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 12px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.82rem;
}

.type-delivery {
  background: #eef4ff;
  color: #1d4ed8;
}

.type-pickup {
  background: #ecfeff;
  color: #0f766e;
}

.eta-fast {
  background: #fef3c7;
  color: #92400e;
}

.eta-standard {
  background: #e2e8f0;
  color: #334155;
}

.eta-heavy {
  background: #ffedd5;
  color: #9a3412;
}

.eta-pickup {
  background: #d1fae5;
  color: #065f46;
}

.method-fee strong {
  font-size: 1.05rem;
  font-weight: 800;
  color: #111827;
}

.method-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  border: none;
  border-radius: 10px;
  padding: 9px 12px;
  background: #f8fafc;
  color: #0f172a;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #eef2f7;
}

.action-delete {
  background: #fef2f2;
  color: #dc2626;
}

.action-delete:hover {
  background: #fee2e2;
}

.table-loading,
.empty-wrap {
  padding: 40px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tip-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 20px 22px;
  border-radius: 24px;
  background: linear-gradient(135deg, #dff4ff, #c4e7ff);
  border: 1px solid #b7dcf8;
}

.tip-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.5);
  display: grid;
  place-items: center;
  color: #0369a1;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.tip-copy strong {
  font-size: 1.4rem;
  font-weight: 800;
  color: #082f49;
}

.tip-copy p {
  margin-top: 8px;
  color: #0f172a;
  line-height: 1.7;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .methods-table-head,
  .method-row {
    grid-template-columns: minmax(240px, 2fr) 130px 140px 140px 100px 130px;
  }
}

@media (max-width: 900px) {
  .shipping-page-header,
  .toolbar-card,
  .tip-card {
    flex-direction: column;
    align-items: stretch;
  }

  .shipping-header-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    min-width: 0;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .methods-table-head {
    display: none;
  }

  .method-row {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .method-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .shipping-header-actions,
  .method-actions {
    width: 100%;
  }

  .shipping-header-actions .btn-create-unified {
    width: 100%;
    min-width: 0;
  }

  .method-actions {
    flex-wrap: wrap;
  }

  .action-btn {
    flex: 1 1 140px;
  }

  .tip-copy strong {
    font-size: 1.15rem;
  }
}
</style>
