<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { inventoryService, type AdjustInventoryDto, type InventoryItem } from '@/services/inventory.service'
import { useAppToast } from '@/composables/useToast'
import { formatDateTime, formatNumber } from '@/utils/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'

interface SelectedInventoryItem {
  variantId: string
  productId?: string
  productName: string
  skuCode: string
  stock: number
  categoryName: string
  variantInfo: string
  imageUrl: string
}

const props = defineProps<{
  visible: boolean
  item?: SelectedInventoryItem | null
}>()

const emit = defineEmits<{ 'update:visible': [value: boolean]; adjusted: [] }>()

const router = useRouter()
const toast = useAppToast()

const saving = ref(false)
const loadingDetail = ref(false)
const detail = ref<InventoryItem | null>(null)

const createDefaultForm = (): AdjustInventoryDto => ({
  variant_id: '',
  type: 'IN',
  quantity: 1,
  note: '',
})

const form = ref<AdjustInventoryDto>(createDefaultForm())

const adjustmentOptions = [
  { value: 'IN' as const, label: 'Nhập kho', helper: 'Cộng thêm vào tồn hiện tại' },
  { value: 'OUT' as const, label: 'Xuất kho', helper: 'Trừ ra khỏi tồn hiện tại' },
  { value: 'ADJUST' as const, label: 'Điều chỉnh', helper: 'Đặt lại về tồn kho mới' },
  { value: 'RETURN' as const, label: 'Trả hàng', helper: 'Cộng lại hàng hoàn về kho' },
]

const buildVariantInfo = (variantValues?: any[]) => {
  const labels = (variantValues || [])
    .map((entry) => {
      const attributeName = entry?.attribute_value?.attribute?.name
      const value = entry?.attribute_value?.value
      if (!attributeName || !value) return ''
      return `${attributeName}: ${value}`
    })
    .filter(Boolean)

  return labels.length ? labels.join(' / ') : 'Phiên bản mặc định'
}

const currentStock = computed(() => Number(detail.value?.stock ?? props.item?.stock ?? 0))
const recentLogs = computed(() => detail.value?.recent_logs || [])
const productName = computed(() => detail.value?.product?.name || props.item?.productName || 'Sản phẩm')
const skuCode = computed(() => detail.value?.sku_code || props.item?.skuCode || 'Chưa có SKU')
const imageUrl = computed(
  () => detail.value?.image_url || detail.value?.product?.images?.[0]?.image_url || props.item?.imageUrl || '',
)
const variantInfo = computed(
  () => buildVariantInfo(detail.value?.variant_values) || props.item?.variantInfo || 'Phiên bản mặc định',
)

const quantityLabel = computed(() =>
  form.value.type === 'ADJUST' ? 'Tồn kho mới' : 'Số lượng thay đổi',
)

const quantityHint = computed(() => {
  switch (form.value.type) {
    case 'OUT':
      return `Có thể xuất tối đa ${formatNumber(currentStock.value)} đơn vị`
    case 'ADJUST':
      return 'Nhập số tồn kho cuối cùng bạn muốn hệ thống ghi nhận'
    case 'RETURN':
      return 'Dùng khi cần cộng hàng hoàn, đổi trả hoặc nhập lại từ khách'
    default:
      return 'Dùng cho các đợt nhập hàng, bổ sung lô mới hoặc kiểm kê tăng'
  }
})

const notePlaceholder = computed(() => {
  switch (form.value.type) {
    case 'OUT':
      return 'Ví dụ: Xuất cho đơn offline, chuyển sang kho khác...'
    case 'ADJUST':
      return 'Ví dụ: Chênh lệch sau kiểm kê cuối ngày...'
    case 'RETURN':
      return 'Ví dụ: Khách hoàn hàng, hàng đổi size quay lại kho...'
    default:
      return 'Ví dụ: Nhập thêm lô mới, bổ sung sau khi đối soát...'
  }
})

const previewAfterStock = computed(() => {
  if (form.value.type === 'ADJUST') return form.value.quantity
  if (form.value.type === 'OUT') return currentStock.value - form.value.quantity
  return currentStock.value + form.value.quantity
})

const validationMessage = computed(() => {
  if (!form.value.variant_id.trim()) return 'Không tìm thấy SKU cần điều chỉnh.'

  if (form.value.type === 'ADJUST' && form.value.quantity < 0) {
    return 'Tồn kho mới không được nhỏ hơn 0.'
  }

  if (form.value.type !== 'ADJUST' && form.value.quantity <= 0) {
    return 'Số lượng thay đổi phải lớn hơn 0.'
  }

  if (form.value.type === 'OUT' && form.value.quantity > currentStock.value) {
    return `Tồn hiện tại chỉ còn ${formatNumber(currentStock.value)} đơn vị, không thể xuất nhiều hơn.`
  }

  return ''
})

const confirmLabel = computed(() => {
  switch (form.value.type) {
    case 'OUT':
      return 'Xác nhận xuất kho'
    case 'ADJUST':
      return 'Xác nhận điều chỉnh'
    case 'RETURN':
      return 'Xác nhận trả hàng'
    default:
      return 'Xác nhận nhập kho'
  }
})

const closeDialog = () => {
  emit('update:visible', false)
}

const hydrateDetail = async () => {
  if (!props.item?.variantId || !props.visible) return

  form.value = {
    variant_id: props.item.variantId,
    type: 'IN',
    quantity: 1,
    note: '',
  }

  loadingDetail.value = true
  try {
    const { data } = await inventoryService.getByVariantId(props.item.variantId)
    detail.value = data.data || null
  } catch {
    detail.value = null
    toast.error('Không thể tải chi tiết tồn kho của SKU này')
  } finally {
    loadingDetail.value = false
  }
}

const handleSubmit = async () => {
  if (validationMessage.value) {
    toast.warn(validationMessage.value)
    return
  }

  saving.value = true

  try {
    await inventoryService.adjust(form.value)
    toast.success('Điều chỉnh kho thành công')
    emit('adjusted')
  } catch (error: any) {
    toast.error('Điều chỉnh thất bại', error.response?.data?.message || 'Không thể cập nhật tồn kho')
  } finally {
    saving.value = false
  }
}

const goToLogs = () => {
  if (!form.value.variant_id) return
  closeDialog()
  router.push({
    path: '/inventory/logs',
    query: {
      variant_id: form.value.variant_id,
      product_name: productName.value,
      sku: skuCode.value !== 'Chưa có SKU' ? skuCode.value : undefined,
    },
  })
}

watch(
  () => [props.visible, props.item?.variantId] as const,
  async ([visible, variantId]) => {
    if (!visible || !variantId) return
    await hydrateDetail()
  },
  { immediate: true },
)

watch(
  () => props.visible,
  (visible) => {
    if (visible) return
    detail.value = null
    form.value = createDefaultForm()
  },
)

watch(
  () => form.value.type,
  (type) => {
    if (type === 'ADJUST') {
      form.value.quantity = Math.max(form.value.quantity, currentStock.value)
    } else if (form.value.quantity <= 0) {
      form.value.quantity = 1
    }
  },
)
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    dismissableMask
    class="inventory-adjust-dialog"
    :style="{ width: '760px', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="dialog-header">
        <div>
          <p class="dialog-overline">ĐIỀU CHỈNH KHO</p>
          <h3 class="dialog-title">Cập nhật tồn kho theo SKU</h3>
        </div>
      </div>
    </template>

    <div v-if="item" class="adjust-shell">
      <div class="product-strip">
        <div class="product-thumb">
          <img v-if="imageUrl" :src="imageUrl" :alt="productName" />
          <i v-else class="pi pi-image"></i>
        </div>

        <div class="product-summary">
          <h4>{{ productName }}</h4>
          <p>{{ variantInfo }}</p>
          <span class="sku-chip">{{ skuCode }}</span>
        </div>
      </div>

      <div class="stock-grid">
        <article class="stock-card">
          <span class="stock-label">Tồn hiện tại</span>
          <strong class="stock-number stock-before">{{ formatNumber(currentStock) }}</strong>
          <span class="stock-note">Số lượng đang có trước thao tác</span>
        </article>

        <article class="stock-card stock-card-accent">
          <span class="stock-label">{{ form.type === 'ADJUST' ? 'Tồn kho mới' : 'Tồn sau thao tác' }}</span>
          <strong class="stock-number" :class="previewAfterStock < 0 ? 'stock-danger' : 'stock-after'">
            {{ formatNumber(previewAfterStock) }}
          </strong>
          <span class="stock-note">Preview để tránh nhầm trước khi lưu</span>
        </article>
      </div>

      <div class="adjust-mode-grid">
        <button
          v-for="option in adjustmentOptions"
          :key="option.value"
          type="button"
          class="adjust-mode"
          :class="{ active: form.type === option.value }"
          @click="form.type = option.value"
        >
          <span class="adjust-mode-label">{{ option.label }}</span>
          <span class="adjust-mode-helper">{{ option.helper }}</span>
        </button>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label>{{ quantityLabel }}</label>
          <InputNumber
            v-model="form.quantity"
            :min="form.type === 'ADJUST' ? 0 : 1"
            :useGrouping="false"
            class="w-full"
            inputClass="w-full"
          />
          <span class="field-hint">{{ quantityHint }}</span>
        </div>

        <div class="form-field form-field-wide">
          <label>Lý do / ghi chú</label>
          <Textarea
            v-model="form.note"
            rows="4"
            class="w-full"
            :placeholder="notePlaceholder"
          />
          <span class="field-hint">Ghi rõ nguyên nhân để tra cứu log nhanh hơn về sau.</span>
        </div>
      </div>

      <p v-if="validationMessage" class="validation-message">
        <i class="pi pi-exclamation-circle"></i>
        {{ validationMessage }}
      </p>

      <section class="recent-section">
        <div class="recent-header">
          <div>
            <p class="recent-overline">LỊCH SỬ GẦN NHẤT</p>
            <h4 class="recent-title">Nhật ký thay đổi của SKU này</h4>
          </div>

          <Button label="Xem toàn bộ log" text @click="goToLogs" />
        </div>

        <div v-if="loadingDetail" class="recent-loading">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Đang tải lịch sử gần đây...</span>
        </div>

        <div v-else-if="recentLogs.length" class="recent-list">
          <div v-for="log in recentLogs.slice(0, 4)" :key="log.id" class="recent-item">
            <div class="recent-main">
              <StatusBadge :status="log.type" />
              <strong class="recent-stock">{{ formatNumber(log.before_stock || 0) }} → {{ formatNumber(log.after_stock || 0) }}</strong>
            </div>
            <div class="recent-meta">
              <span>{{ formatDateTime(log.created_at) }}</span>
              <span>{{ log.note || 'Không có ghi chú' }}</span>
            </div>
          </div>
        </div>

        <div v-else class="recent-empty">
          <i class="pi pi-history"></i>
          <span>SKU này chưa có lịch sử điều chỉnh gần đây.</span>
        </div>
      </section>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <Button label="Hủy" severity="secondary" text @click="closeDialog" />
        <Button
          :label="confirmLabel"
          class="btn-gradient"
          :loading="saving"
          :disabled="Boolean(validationMessage) || loadingDetail"
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.dialog-header {
  display: flex;
  align-items: center;
}

.dialog-overline,
.recent-overline {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-light);
}

.dialog-title,
.recent-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-top: 4px;
}

.adjust-shell {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.product-strip {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.08), rgba(255, 215, 0, 0.1));
}

.product-thumb {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(255, 107, 43, 0.12);
  display: grid;
  place-items: center;
  color: var(--text-light);
  flex-shrink: 0;
}

.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.product-summary h4 {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
}

.product-summary p {
  color: var(--text-muted);
  line-height: 1.6;
}

.sku-chip {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.25);
  font-weight: 700;
  color: #334155;
  font-size: 0.82rem;
}

.stock-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.stock-card {
  border-radius: 18px;
  border: 1px solid #edf2f7;
  background: #f8fafc;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stock-card-accent {
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.12), rgba(255, 159, 74, 0.18));
  border-color: rgba(255, 107, 43, 0.18);
}

.stock-label {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-light);
  text-transform: uppercase;
}

.stock-number {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.stock-before {
  color: var(--text-primary);
}

.stock-after {
  color: var(--primary-dark);
}

.stock-danger {
  color: #dc2626;
}

.stock-note {
  color: var(--text-muted);
}

.adjust-mode-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.adjust-mode {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  background: #fff;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.adjust-mode:hover {
  border-color: rgba(255, 107, 43, 0.25);
  transform: translateY(-1px);
}

.adjust-mode.active {
  border-color: rgba(255, 107, 43, 0.25);
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.1), rgba(255, 215, 0, 0.14));
  box-shadow: 0 8px 18px rgba(255, 107, 43, 0.1);
}

.adjust-mode-label {
  font-weight: 800;
  color: var(--text-primary);
}

.adjust-mode-helper {
  color: var(--text-muted);
  font-size: 0.82rem;
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(0, 1.4fr);
  gap: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field label {
  font-weight: 700;
  color: var(--text-primary);
}

.field-hint {
  color: var(--text-light);
  font-size: 0.82rem;
  line-height: 1.5;
}

.validation-message {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #dc2626;
  font-weight: 600;
}

.recent-section {
  border-radius: 18px;
  border: 1px solid #edf2f7;
  background: #fbfdff;
  padding: 18px;
}

.recent-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.recent-loading,
.recent-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px 0;
  color: var(--text-muted);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.recent-item {
  border-radius: 14px;
  border: 1px solid #edf2f7;
  background: #fff;
  padding: 12px 14px;
}

.recent-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.recent-stock {
  color: var(--text-primary);
  font-weight: 800;
}

.recent-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 768px) {
  .stock-grid,
  .adjust-mode-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .product-strip {
    align-items: flex-start;
  }

  .recent-header,
  .recent-main,
  .recent-meta,
  .dialog-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .dialog-footer :deep(.p-button) {
    width: 100%;
  }
}
</style>
