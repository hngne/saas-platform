<script setup lang="ts">
import { ref } from 'vue'
import { inventoryService, type AdjustInventoryDto } from '@/services/inventory.service'
import { useAppToast } from '@/composables/useToast'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean]; adjusted: [] }>()

const toast = useAppToast()
const saving = ref(false)

const form = ref<AdjustInventoryDto>({
  variant_id: '',
  type: 'IN',
  quantity: 1,
  note: '',
})

const typeOptions = [
  { label: 'Nhập kho (IN)', value: 'IN' },
  { label: 'Xuất kho (OUT)', value: 'OUT' },
  { label: 'Điều chỉnh (ADJUST)', value: 'ADJUST' },
]

const handleSubmit = async () => {
  if (!form.value.variant_id.trim()) {
    toast.warn('Vui lòng nhập Variant ID')
    return
  }
  if (form.value.quantity <= 0) {
    toast.warn('Số lượng phải lớn hơn 0')
    return
  }
  saving.value = true
  try {
    await inventoryService.adjust(form.value)
    toast.success('Điều chỉnh kho thành công')
    form.value = { variant_id: '', type: 'IN', quantity: 1, note: '' }
    emit('adjusted')
  } catch (err: any) {
    toast.error('Lỗi', err.response?.data?.message || 'Điều chỉnh thất bại')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :visible="visible" @update:visible="emit('update:visible', $event)" header="Điều chỉnh kho" modal :style="{ width: '450px' }">
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-4 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold">Variant ID *</label>
        <InputText v-model="form.variant_id" placeholder="UUID của variant" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold">Loại điều chỉnh *</label>
        <Select v-model="form.type" :options="typeOptions" optionLabel="label" optionValue="value" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold">Số lượng *</label>
        <InputNumber v-model="form.quantity" :min="1" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold">Ghi chú</label>
        <Textarea v-model="form.note" rows="2" class="w-full" placeholder="Lý do điều chỉnh..." />
      </div>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Hủy" severity="secondary" text @click="emit('update:visible', false)" />
        <Button label="Xác nhận" class="btn-gradient" :loading="saving" @click="handleSubmit" />
      </div>
    </template>
  </Dialog>
</template>
