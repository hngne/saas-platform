<script setup lang="ts">
import { ref } from 'vue'
import { attributeService } from '@/services/attribute.service'
import { useAppToast } from '@/composables/useToast'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean]; saved: [] }>()

const toast = useAppToast()
const saving = ref(false)
const name = ref('')
const values = ref<Array<{ value: string; color_hex: string | null }>>([{ value: '', color_hex: null }])

const addRow = () => {
  values.value.push({ value: '', color_hex: null })
}

const removeRow = (i: number) => {
  if (values.value.length > 1) values.value.splice(i, 1)
}

const handleSubmit = async () => {
  if (!name.value.trim()) {
    toast.warn('Tên thuộc tính không được để trống')
    return
  }
  const validValues = values.value.filter(v => v.value.trim())
  if (validValues.length === 0) {
    toast.warn('Phải có ít nhất 1 giá trị')
    return
  }
  saving.value = true
  try {
    await attributeService.create({ name: name.value, values: validValues })
    toast.success('Tạo thuộc tính thành công')
    name.value = ''
    values.value = [{ value: '', color_hex: null }]
    emit('saved')
  } catch (err: any) {
    toast.error('Lỗi', err.response?.data?.message || 'Tạo thất bại')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="Thêm thuộc tính"
    modal
    :style="{ width: '500px' }"
  >
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-4 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold">Tên thuộc tính *</label>
        <InputText v-model="name" placeholder="VD: Màu sắc, Kích thước" class="w-full" />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-xs font-semibold">Giá trị</label>
        <div v-for="(val, i) in values" :key="i" class="flex items-center gap-2">
          <InputText v-model="val.value" placeholder="VD: Đỏ, XL" class="flex-1" />
          <input type="color" v-model="val.color_hex" class="w-8 h-8 rounded cursor-pointer border" />
          <Button
            icon="pi pi-minus"
            text rounded size="small"
            severity="danger"
            :disabled="values.length <= 1"
            @click="removeRow(i)"
          />
        </div>
        <Button label="Thêm giá trị" icon="pi pi-plus" text size="small" @click="addRow" />
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Hủy" severity="secondary" text @click="emit('update:visible', false)" />
        <Button label="Tạo mới" class="btn-gradient" :loading="saving" @click="handleSubmit" />
      </div>
    </template>
  </Dialog>
</template>
