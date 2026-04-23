<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import Slider from 'primevue/slider'
import Button from 'primevue/button'
import { voucherService, type CreateVoucherDto, type Voucher } from '@/services/voucher.service'
import { useAppToast } from '@/composables/useToast'
import { formatVND } from '@/utils/format'

type DiscountType = 'FIXED' | 'PERCENT'
type SaveMode = 'draft' | 'publish'

interface VoucherFormState {
  code: string
  name: string
  discount_type: DiscountType
  discount_value: number
  min_order_value: number | null
  max_discount: number | null
  usage_limit: number | null
  start_date: Date | null
  end_date: Date | null
  is_active: boolean
}

const props = defineProps<{
  visible: boolean
  voucher: Voucher | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const toast = useAppToast()
const savingMode = ref<SaveMode | ''>('')
const limitEnabled = ref(true)
const usageSlider = ref(500)

const isEdit = computed(() => !!props.voucher?.id)

const createDefaultForm = (): VoucherFormState => ({
  code: '',
  name: '',
  discount_type: 'FIXED',
  discount_value: 0,
  min_order_value: null,
  max_discount: null,
  usage_limit: 500,
  start_date: null,
  end_date: null,
  is_active: true,
})

const form = ref<VoucherFormState>(createDefaultForm())

const discountOptions = [
  {
    label: 'Giảm cố định',
    value: 'FIXED' as DiscountType,
    helper: 'Phù hợp cho voucher chào mừng, freeship, hoặc giảm tiền trực tiếp.',
  },
  {
    label: 'Giảm phần trăm',
    value: 'PERCENT' as DiscountType,
    helper: 'Tạo cảm giác ưu đãi mạnh hơn cho chiến dịch sale theo mùa.',
  },
]

const selectedDiscountMeta = computed(() =>
  discountOptions.find((option) => option.value === form.value.discount_type) || discountOptions[0]!,
)

const previewValue = computed(() => {
  if (form.value.discount_type === 'PERCENT') {
    return `${form.value.discount_value || 0}%`
  }

  return formatVND(form.value.discount_value || 0)
})

const scheduleLabel = computed(() => {
  if (!form.value.start_date && !form.value.end_date) return 'Không giới hạn thời gian'
  if (form.value.start_date && !form.value.end_date) return 'Hiệu lực từ ngày bắt đầu'
  if (!form.value.start_date && form.value.end_date) return 'Hết hạn tại ngày kết thúc'
  return 'Có khung thời gian cụ thể'
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return

    if (props.voucher) {
      form.value = {
        code: props.voucher.code,
        name: props.voucher.name || '',
        discount_type: props.voucher.discount_type,
        discount_value: props.voucher.discount_value,
        min_order_value: props.voucher.min_order_value ?? null,
        max_discount: props.voucher.max_discount ?? null,
        usage_limit: props.voucher.usage_limit ?? 500,
        start_date: props.voucher.start_date ? new Date(props.voucher.start_date) : null,
        end_date: props.voucher.end_date ? new Date(props.voucher.end_date) : null,
        is_active: props.voucher.is_active,
      }
      limitEnabled.value = props.voucher.usage_limit != null
      usageSlider.value = props.voucher.usage_limit ?? 500
      return
    }

    form.value = createDefaultForm()
    limitEnabled.value = true
    usageSlider.value = 500
  },
)

watch(limitEnabled, (enabled) => {
  form.value.usage_limit = enabled ? usageSlider.value : null
})

watch(usageSlider, (value) => {
  if (limitEnabled.value) {
    form.value.usage_limit = value
  }
})

const close = () => emit('update:visible', false)

const validateForm = () => {
  if (!form.value.code.trim()) {
    toast.warn('Mã voucher không được để trống')
    return false
  }

  if (form.value.discount_value <= 0) {
    toast.warn('Giá trị giảm phải lớn hơn 0')
    return false
  }

  if (form.value.discount_type === 'PERCENT' && form.value.discount_value > 100) {
    toast.warn('Voucher phần trăm không được vượt quá 100%')
    return false
  }

  if (
    form.value.start_date &&
    form.value.end_date &&
    form.value.end_date.getTime() <= form.value.start_date.getTime()
  ) {
    toast.warn('Ngày kết thúc phải sau ngày bắt đầu')
    return false
  }

  return true
}

const handleSubmit = async (mode: SaveMode) => {
  if (!validateForm()) return

  const dto: CreateVoucherDto = {
    code: form.value.code.trim().toUpperCase(),
    name: form.value.name.trim() || undefined,
    discount_type: form.value.discount_type,
    discount_value: form.value.discount_value,
    min_order_value: form.value.min_order_value,
    max_discount: form.value.discount_type === 'PERCENT' ? form.value.max_discount : null,
    usage_limit: limitEnabled.value ? form.value.usage_limit : null,
    start_date: form.value.start_date?.toISOString() || null,
    end_date: form.value.end_date?.toISOString() || null,
    is_active: mode === 'draft' ? false : form.value.is_active,
  }

  savingMode.value = mode
  try {
    if (isEdit.value) {
      await voucherService.update(props.voucher!.id, dto)
      toast.success(mode === 'draft' ? 'Đã lưu voucher ở trạng thái nháp' : 'Đã cập nhật voucher')
    } else {
      await voucherService.create(dto)
      toast.success(mode === 'draft' ? 'Đã tạo voucher nháp' : 'Đã tạo voucher thành công')
    }
    emit('saved')
  } catch (error: any) {
    toast.error('Lỗi', error?.response?.data?.message || 'Không thể lưu voucher')
  } finally {
    savingMode.value = ''
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    dismissableMask
    position="right"
    :draggable="false"
    :closable="true"
    class="voucher-drawer"
    :style="{ width: '680px', maxWidth: '100vw', height: '100vh', margin: 0 }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="drawer-header">
        <div>
          <p class="drawer-overline">Biên tập chiến dịch</p>
          <h3 class="drawer-title">{{ isEdit ? 'Cập nhật voucher' : 'Thêm voucher' }}</h3>
        </div>
      </div>
    </template>

    <div class="drawer-body">
      <section class="editor-section preview-section">
        <div class="preview-copy">
          <p class="preview-overline">{{ selectedDiscountMeta.label }}</p>
          <h4>{{ form.name || form.code || 'Voucher mới của shop' }}</h4>
          <p>{{ selectedDiscountMeta.helper }}</p>
        </div>

        <div class="preview-stats">
          <article class="preview-stat">
            <span>Ưu đãi</span>
            <strong>{{ previewValue }}</strong>
          </article>
          <article class="preview-stat">
            <span>Lịch</span>
            <strong>{{ scheduleLabel }}</strong>
          </article>
        </div>
      </section>

      <section class="editor-section">
        <div class="section-head">
          <span class="section-dot"></span>
          <h4>Thông tin cơ bản</h4>
        </div>

        <div class="field-stack">
          <label>Mã voucher</label>
          <InputText v-model="form.code" placeholder="VD: SUMMER2024" class="w-full uppercase" />
        </div>

        <div class="field-stack">
          <label>Tên nội bộ</label>
          <InputText v-model="form.name" placeholder="Ví dụ: Chiến dịch hè 2026" class="w-full" />
        </div>
      </section>

      <section class="editor-section">
        <div class="section-head">
          <span class="section-dot"></span>
          <h4>Thiết lập ưu đãi</h4>
        </div>

        <div class="discount-switcher">
          <button
            v-for="option in discountOptions"
            :key="option.value"
            type="button"
            class="discount-tab"
            :class="{ active: form.discount_type === option.value }"
            @click="form.discount_type = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="field-grid">
          <div class="field-stack">
            <label>Giá trị giảm</label>
            <InputNumber
              v-if="form.discount_type === 'FIXED'"
              v-model="form.discount_value"
              :min="0"
              mode="currency"
              currency="VND"
              locale="vi-VN"
              class="w-full"
            />
            <InputNumber
              v-else
              v-model="form.discount_value"
              :min="0"
              :max="100"
              suffix="%"
              class="w-full"
            />
          </div>

          <div class="field-stack">
            <label>Đơn tối thiểu</label>
            <InputNumber
              v-model="form.min_order_value"
              :min="0"
              mode="currency"
              currency="VND"
              locale="vi-VN"
              class="w-full"
            />
          </div>
        </div>

        <div v-if="form.discount_type === 'PERCENT'" class="field-stack">
          <label>Giảm tối đa</label>
          <InputNumber
            v-model="form.max_discount"
            :min="0"
            mode="currency"
            currency="VND"
            locale="vi-VN"
            class="w-full"
          />
        </div>
      </section>

      <section class="editor-section">
        <div class="section-head">
          <span class="section-dot"></span>
          <h4>Điều kiện và giới hạn</h4>
        </div>

        <div class="limit-toggle">
          <div>
            <strong>Giới hạn lượt dùng</strong>
            <p>{{ limitEnabled ? 'Voucher sẽ dừng khi chạm ngưỡng lượt dùng.' : 'Voucher không giới hạn số lần áp dụng.' }}</p>
          </div>
          <ToggleSwitch v-model="limitEnabled" />
        </div>

        <div v-if="limitEnabled" class="slider-wrap">
          <div class="slider-head">
            <span>Số lượt dùng tối đa</span>
            <strong>{{ form.usage_limit }}</strong>
          </div>
          <Slider v-model="usageSlider" :min="50" :max="5000" :step="50" />
        </div>

        <div class="field-grid">
          <div class="field-stack">
            <label>Ngày bắt đầu</label>
            <DatePicker v-model="form.start_date" dateFormat="dd/mm/yy" showIcon class="w-full" />
          </div>

          <div class="field-stack">
            <label>Ngày kết thúc</label>
            <DatePicker v-model="form.end_date" dateFormat="dd/mm/yy" showIcon class="w-full" />
          </div>
        </div>

        <div class="activation-card">
          <div>
            <strong>Kích hoạt ngay sau khi lưu</strong>
            <p>Voucher sẽ hiển thị ngay cho khách hàng nếu đang trong thời gian hiệu lực.</p>
          </div>
          <ToggleSwitch v-model="form.is_active" />
        </div>
      </section>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <button type="button" class="footer-link" @click="close">Hủy thay đổi</button>

        <div class="footer-actions">
          <Button
            label="Lưu nháp"
            outlined
            class="draft-btn"
            :loading="savingMode === 'draft'"
            @click="handleSubmit('draft')"
          />
          <Button
            :label="isEdit ? 'Lưu voucher' : 'Xuất bản voucher'"
            class="btn-create-unified"
            :loading="savingMode === 'publish'"
            @click="handleSubmit('publish')"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.voucher-drawer :deep(.p-dialog-header),
.voucher-drawer :deep(.p-dialog-footer) {
  padding: 0;
  border: none;
}

.voucher-drawer :deep(.p-dialog-content) {
  padding: 0;
}

.voucher-drawer :deep(.p-dialog) {
  border-radius: 0;
}

.drawer-header {
  width: 100%;
  padding: 26px 28px 18px;
  border-bottom: 1px solid #edf2f7;
}

.drawer-overline {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #c2410c;
}

.drawer-title {
  margin-top: 10px;
  font-size: clamp(1.7rem, 3vw, 2.4rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  color: #111827;
}

.drawer-body {
  max-height: calc(100vh - 176px);
  overflow-y: auto;
  padding: 24px 28px 8px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.editor-section {
  padding-bottom: 8px;
}

.preview-section {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.08), rgba(255, 214, 10, 0.14));
  border: 1px solid rgba(255, 107, 43, 0.14);
}

.preview-copy {
  max-width: 340px;
}

.preview-overline {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #c2410c;
}

.preview-copy h4 {
  margin-top: 8px;
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: #111827;
}

.preview-copy p {
  margin-top: 8px;
  color: #64748b;
  line-height: 1.7;
}

.preview-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 180px;
}

.preview-stat {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.92);
}

.preview-stat span {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #94a3b8;
}

.preview-stat strong {
  display: block;
  margin-top: 8px;
  color: #111827;
  font-size: 1rem;
  line-height: 1.4;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
}

.section-head h4 {
  font-size: 0.9rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #94a3b8;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.field-stack label {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.discount-switcher {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
  padding: 4px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
}

.discount-tab {
  min-height: 56px;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: #64748b;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.discount-tab.active {
  background: #fff;
  color: #c2410c;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.05);
}

.limit-toggle,
.activation-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid #edf2f7;
  margin-bottom: 16px;
}

.limit-toggle strong,
.activation-card strong {
  color: #111827;
  font-weight: 800;
}

.limit-toggle p,
.activation-card p {
  margin-top: 6px;
  color: #64748b;
  line-height: 1.6;
}

.slider-wrap {
  margin-bottom: 18px;
  padding: 18px 16px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
}

.slider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  color: #475569;
  font-weight: 700;
}

.slider-head strong {
  font-size: 1.1rem;
  color: #111827;
}

.drawer-footer {
  padding: 18px 28px 24px;
  border-top: 1px solid #edf2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.footer-link {
  border: none;
  background: transparent;
  color: #64748b;
  font-weight: 700;
  cursor: pointer;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.draft-btn :deep(.p-button) {
  border-radius: 10px;
  min-width: 156px;
  font-weight: 800;
}

.voucher-drawer :deep(.p-inputtext),
.voucher-drawer :deep(.p-inputnumber-input),
.voucher-drawer :deep(.p-datepicker-input),
.voucher-drawer :deep(.p-datepicker) {
  width: 100%;
  min-height: 54px;
  border-radius: 16px;
}

.voucher-drawer :deep(.p-slider-range) {
  background: #c2410c;
}

.voucher-drawer :deep(.p-slider-handle) {
  border-color: #c2410c;
}

@media (max-width: 768px) {
  .drawer-header,
  .drawer-body,
  .drawer-footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .preview-section,
  .drawer-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .preview-stats,
  .footer-actions {
    width: 100%;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }

  .footer-actions :deep(.p-button) {
    width: 100%;
  }
}
</style>
