<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { shippingService, type CreateShippingDto, type ShippingMethod } from '@/services/shipping.service'
import { useAppToast } from '@/composables/useToast'
import { formatVND } from '@/utils/format'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'

const props = defineProps<{ visible: boolean; shipping: ShippingMethod | null }>()
const emit = defineEmits<{ 'update:visible': [value: boolean]; saved: [] }>()

const toast = useAppToast()
const saving = ref(false)
const isEdit = computed(() => !!props.shipping?.id)

const createDefaultForm = (): CreateShippingDto => ({
  name: '',
  type: 'DELIVERY',
  fee: 0,
  estimated_days: 1,
  is_active: true,
})

const form = ref<CreateShippingDto>(createDefaultForm())

const typeOptions = [
  {
    label: 'Giao hàng tận nơi',
    value: 'DELIVERY' as const,
    helper: 'Phù hợp cho ship nội thành, toàn quốc hoặc qua đơn vị vận chuyển.',
  },
  {
    label: 'Nhận tại cửa hàng',
    value: 'PICKUP' as const,
    helper: 'Khách đến shop lấy hàng, có thể để phí bằng 0.',
  },
]

const selectedTypeMeta = computed(() =>
  typeOptions.find((option) => option.value === form.value.type) || typeOptions[0]!,
)

const etaLabel = computed(() => {
  if (form.value.type === 'PICKUP') return 'Nhận tại shop'
  if (!form.value.estimated_days) return 'Chưa đặt thời gian'
  if (form.value.estimated_days <= 1) return '1 ngày'
  return `${form.value.estimated_days} ngày`
})

const estimatedDaysHint = computed(() =>
  form.value.type === 'PICKUP'
    ? 'Có thể để 1 ngày để biểu thị khách nhận trong ngày hoặc ngày hẹn gần nhất.'
    : 'Thiết lập số ngày giao dự kiến để hiển thị cho khách khi checkout.',
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return

    if (props.shipping) {
      form.value = {
        name: props.shipping.name,
        type: props.shipping.type || 'DELIVERY',
        fee: props.shipping.fee,
        estimated_days: props.shipping.estimated_days ?? 1,
        is_active: props.shipping.is_active,
      }
      return
    }

    form.value = createDefaultForm()
  },
)

watch(
  () => form.value.type,
  (type) => {
    if (type === 'PICKUP' && form.value.fee < 0) {
      form.value.fee = 0
    }
  },
)

const handleSubmit = async () => {
  if (!form.value.name.trim()) {
    toast.warn('Tên phương thức không được để trống')
    return
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await shippingService.update(props.shipping!.id, form.value)
      toast.success('Cập nhật phương thức vận chuyển thành công')
    } else {
      await shippingService.create(form.value)
      toast.success('Tạo phương thức vận chuyển thành công')
    }
    emit('saved')
  } catch (err: any) {
    toast.error('Lỗi', err.response?.data?.message || 'Không thể lưu phương thức vận chuyển')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    dismissableMask
    class="shipping-form-dialog"
    :style="{ width: '680px', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="dialog-header">
        <div>
          <p class="dialog-overline">PHƯƠNG THỨC VẬN CHUYỂN</p>
          <h3 class="dialog-title">{{ isEdit ? 'Chỉnh sửa phương thức vận chuyển' : 'Thêm phương thức vận chuyển' }}</h3>
        </div>
      </div>
    </template>

    <div class="dialog-body">
      <div class="preview-card">
        <div class="preview-copy">
          <span class="preview-kicker">{{ selectedTypeMeta.label }}</span>
          <strong class="preview-title">{{ form.name || 'Tên phương thức sẽ hiển thị ở đây' }}</strong>
          <p class="preview-subtitle">{{ selectedTypeMeta.helper }}</p>
        </div>

        <div class="preview-stats">
          <div class="preview-stat">
            <span class="preview-stat-label">PHÍ</span>
            <strong>{{ formatVND(form.fee || 0) }}</strong>
          </div>
          <div class="preview-stat">
            <span class="preview-stat-label">DỰ KIẾN</span>
            <strong>{{ etaLabel }}</strong>
          </div>
        </div>
      </div>

      <form class="form-grid" @submit.prevent="handleSubmit">
        <div class="form-field form-field-wide">
          <label>Tên phương thức *</label>
          <InputText
            v-model="form.name"
            class="w-full"
            placeholder="Ví dụ: Giao nhanh nội thành, Nhận tại showroom..."
          />
        </div>

        <div class="form-field">
          <label>Loại dịch vụ *</label>
          <Select
            v-model="form.type"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div class="form-field">
          <label>Phí vận chuyển *</label>
          <InputNumber
            v-model="form.fee"
            :min="0"
            mode="currency"
            currency="VND"
            locale="vi-VN"
            class="w-full"
            inputClass="w-full"
          />
        </div>

        <div class="form-field">
          <label>Thời gian dự kiến</label>
          <InputNumber
            v-model="form.estimated_days"
            :min="1"
            class="w-full"
            inputClass="w-full"
          />
          <span class="field-hint">{{ estimatedDaysHint }}</span>
        </div>

        <div class="form-field">
          <label>Trạng thái hiển thị</label>
          <div class="status-box">
            <div>
              <strong>{{ form.is_active ? 'Đang hoạt động' : 'Tạm ẩn' }}</strong>
              <p>{{ form.is_active ? 'Khách có thể chọn ở checkout.' : 'Tạm thời không hiển thị cho khách.' }}</p>
            </div>
            <ToggleSwitch v-model="form.is_active" />
          </div>
        </div>
      </form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button label="Hủy" severity="secondary" text @click="emit('update:visible', false)" />
        <Button
          :label="isEdit ? 'Lưu thay đổi' : 'Thêm phương thức'"
          class="btn-create-unified"
          :loading="saving"
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.dialog-overline {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-light);
}

.dialog-title {
  margin-top: 4px;
  font-size: 1.18rem;
  font-weight: 800;
  color: var(--text-primary);
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.preview-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.08), rgba(255, 215, 0, 0.12));
}

.preview-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-kicker {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--primary-dark);
  text-transform: uppercase;
}

.preview-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
}

.preview-subtitle {
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 420px;
}

.preview-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.preview-stat {
  min-width: 120px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.9);
}

.preview-stat-label {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-light);
}

.preview-stat strong {
  display: block;
  margin-top: 8px;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 800;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field-wide {
  grid-column: 1 / -1;
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

.status-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
}

.status-box strong {
  color: var(--text-primary);
}

.status-box p {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 768px) {
  .preview-card,
  .dialog-footer {
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .dialog-footer :deep(.p-button) {
    width: 100%;
  }
}
</style>
