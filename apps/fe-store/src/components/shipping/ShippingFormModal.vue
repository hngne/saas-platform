<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { shippingService, type ShippingMethod, type CreateShippingDto } from '@/services/shipping.service'
import { useAppToast } from '@/composables/useToast'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'

const props = defineProps<{ visible: boolean; shipping: ShippingMethod | null }>()
const emit = defineEmits<{ 'update:visible': [value: boolean]; saved: [] }>()
const toast = useAppToast()
const saving = ref(false)
const isEdit = computed(() => !!props.shipping?.id)

const form = ref<CreateShippingDto>({ name: '', fee: 0, estimated_days: null, is_active: true })

watch(() => props.visible, (val) => {
  if (val && props.shipping) {
    form.value = { name: props.shipping.name, fee: props.shipping.fee, estimated_days: props.shipping.estimated_days, is_active: props.shipping.is_active }
  } else if (val) {
    form.value = { name: '', fee: 0, estimated_days: null, is_active: true }
  }
})

const handleSubmit = async () => {
  if (!form.value.name.trim()) { toast.warn('Tên không được để trống'); return }
  saving.value = true
  try {
    if (isEdit.value) { await shippingService.update(props.shipping!.id, form.value); toast.success('Cập nhật thành công') }
    else { await shippingService.create(form.value); toast.success('Tạo thành công') }
    emit('saved')
  } catch (err: any) { toast.error('Lỗi', err.response?.data?.message || 'Thất bại') }
  finally { saving.value = false }
}
</script>

<template>
  <Dialog :visible="visible" @update:visible="emit('update:visible', $event)" :header="isEdit ? 'Sửa vận chuyển' : 'Thêm vận chuyển'" modal :style="{ width: '430px' }">
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-4 pt-2">
      <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Tên *</label><InputText v-model="form.name" class="w-full" /></div>
      <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Phí vận chuyển *</label><InputNumber v-model="form.fee" :min="0" mode="currency" currency="VND" locale="vi-VN" class="w-full" /></div>
      <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Thời gian (ngày)</label><InputNumber v-model="form.estimated_days" :min="1" class="w-full" /></div>
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
