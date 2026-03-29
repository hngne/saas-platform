<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { voucherService, type Voucher, type CreateVoucherDto } from '@/services/voucher.service'
import { useAppToast } from '@/composables/useToast'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'

const props = defineProps<{ visible: boolean; voucher: Voucher | null }>()
const emit = defineEmits<{ 'update:visible': [value: boolean]; saved: [] }>()
const toast = useAppToast()
const saving = ref(false)
const isEdit = computed(() => !!props.voucher?.id)

const discountTypes = [{ label: 'Cố định (VND)', value: 'FIXED' }, { label: 'Phần trăm (%)', value: 'PERCENT' }]

// Use Date | null for DatePicker compatibility (DTO uses string | null)
interface VoucherForm {
  code: string
  name: string
  discount_type: 'FIXED' | 'PERCENT'
  discount_value: number
  min_order_value: number | null
  max_discount: number | null
  usage_limit: number | null
  start_date: Date | null
  end_date: Date | null
  is_active: boolean
}

const form = ref<VoucherForm>({
  code: '', name: '', discount_type: 'FIXED', discount_value: 0,
  min_order_value: null, max_discount: null, usage_limit: null,
  start_date: null, end_date: null, is_active: true,
})

watch(() => props.visible, (val) => {
  if (val && props.voucher) {
    form.value = {
      code: props.voucher.code, name: props.voucher.name || '', discount_type: props.voucher.discount_type,
      discount_value: props.voucher.discount_value, min_order_value: props.voucher.min_order_value ?? null,
      max_discount: props.voucher.max_discount ?? null, usage_limit: props.voucher.usage_limit ?? null,
      start_date: props.voucher.start_date ? new Date(props.voucher.start_date) : null,
      end_date: props.voucher.end_date ? new Date(props.voucher.end_date) : null,
      is_active: props.voucher.is_active,
    }
  } else if (val) {
    form.value = { code: '', name: '', discount_type: 'FIXED', discount_value: 0, min_order_value: null, max_discount: null, usage_limit: null, start_date: null, end_date: null, is_active: true }
  }
})

const handleSubmit = async () => {
  if (!form.value.code.trim()) { toast.warn('Mã voucher không được để trống'); return }
  if (form.value.discount_value <= 0) { toast.warn('Giá trị giảm phải lớn hơn 0'); return }

  const dto: CreateVoucherDto = {
    code: form.value.code.toUpperCase(),
    name: form.value.name || undefined,
    discount_type: form.value.discount_type,
    discount_value: form.value.discount_value,
    min_order_value: form.value.min_order_value,
    max_discount: form.value.max_discount,
    usage_limit: form.value.usage_limit,
    start_date: form.value.start_date?.toISOString() || null,
    end_date: form.value.end_date?.toISOString() || null,
    is_active: form.value.is_active,
  }

  saving.value = true
  try {
    if (isEdit.value) { await voucherService.update(props.voucher!.id, dto); toast.success('Cập nhật thành công') }
    else { await voucherService.create(dto); toast.success('Tạo voucher thành công') }
    emit('saved')
  } catch (err: any) { toast.error('Lỗi', err.response?.data?.message || 'Thất bại') }
  finally { saving.value = false }
}
</script>

<template>
  <Dialog :visible="visible" @update:visible="emit('update:visible', $event)" :header="isEdit ? 'Sửa voucher' : 'Thêm voucher'" modal :style="{ width: '520px' }">
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-4 pt-2">
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Mã voucher *</label><InputText v-model="form.code" placeholder="VD: SALE50" class="w-full uppercase" /></div>
        <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Tên</label><InputText v-model="form.name" class="w-full" /></div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold">Loại giảm giá</label>
        <SelectButton v-model="form.discount_type" :options="discountTypes" optionLabel="label" optionValue="value" class="w-full" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Giá trị giảm *</label><InputNumber v-model="form.discount_value" :min="0" class="w-full" /></div>
        <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Đơn tối thiểu</label><InputNumber v-model="form.min_order_value" :min="0" mode="currency" currency="VND" locale="vi-VN" class="w-full" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div v-if="form.discount_type === 'PERCENT'" class="flex flex-col gap-1"><label class="text-xs font-semibold">Giảm tối đa</label><InputNumber v-model="form.max_discount" :min="0" mode="currency" currency="VND" locale="vi-VN" class="w-full" /></div>
        <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Giới hạn lượt dùng</label><InputNumber v-model="form.usage_limit" :min="1" class="w-full" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Ngày bắt đầu</label><DatePicker v-model="form.start_date" dateFormat="dd/mm/yy" showIcon class="w-full" /></div>
        <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Ngày kết thúc</label><DatePicker v-model="form.end_date" dateFormat="dd/mm/yy" showIcon class="w-full" /></div>
      </div>
      <div class="flex items-center gap-2"><ToggleSwitch v-model="form.is_active" /><span class="text-sm">Hoạt động</span></div>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Hủy" severity="secondary" text @click="emit('update:visible', false)" />
        <Button :label="isEdit ? 'Cập nhật' : 'Tạo'" class="btn-gradient" :loading="saving" @click="handleSubmit" />
      </div>
    </template>
  </Dialog>
</template>
