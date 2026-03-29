<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { categoryService, type Category, type CreateCategoryDto } from '@/services/category.service'
import { useAppToast } from '@/composables/useToast'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'

const props = defineProps<{
  visible: boolean
  category: Category | null
  categories: Category[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const toast = useAppToast()
const saving = ref(false)

const form = ref<CreateCategoryDto>({
  name: '',
  description: '',
  image_url: '',
  parent_id: null,
  sort_order: 0,
  is_active: true,
})

const isEdit = computed(() => !!props.category?.id)
const title = computed(() => isEdit.value ? 'Sửa danh mục' : 'Thêm danh mục')

const parentOptions = computed(() =>
  props.categories
    .filter(c => c.id !== props.category?.id)
    .map(c => ({ label: c.name, value: c.id }))
)

watch(() => props.visible, (val) => {
  if (val && props.category) {
    form.value = {
      name: props.category.name,
      description: props.category.description || '',
      image_url: props.category.image_url || '',
      parent_id: props.category.parent_id || null,
      sort_order: props.category.sort_order || 0,
      is_active: props.category.is_active,
    }
  } else if (val) {
    form.value = { name: '', description: '', image_url: '', parent_id: null, sort_order: 0, is_active: true }
  }
})

const handleSubmit = async () => {
  if (!form.value.name.trim()) {
    toast.warn('Tên danh mục không được để trống')
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await categoryService.update(props.category!.id, form.value)
      toast.success('Cập nhật thành công')
    } else {
      await categoryService.create(form.value)
      toast.success('Tạo danh mục thành công')
    }
    emit('saved')
  } catch (err: any) {
    toast.error('Lỗi', err.response?.data?.message || 'Thao tác thất bại')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    :header="title"
    modal
    :style="{ width: '480px' }"
  >
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-4 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold">Tên danh mục *</label>
        <InputText v-model="form.name" placeholder="VD: Thời trang" class="w-full" />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold">Mô tả</label>
        <Textarea v-model="form.description" rows="3" placeholder="Mô tả ngắn..." class="w-full" />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold">URL hình ảnh</label>
        <InputText v-model="form.image_url" placeholder="https://..." class="w-full" />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold">Danh mục cha</label>
        <Select
          v-model="form.parent_id"
          :options="parentOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Không có"
          showClear
          class="w-full"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold">Thứ tự</label>
          <InputNumber v-model="form.sort_order" class="w-full" />
        </div>
        <div class="flex items-center gap-2 pt-5">
          <ToggleSwitch v-model="form.is_active" />
          <span class="text-sm">Hoạt động</span>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Hủy" severity="secondary" text @click="emit('update:visible', false)" />
        <Button :label="isEdit ? 'Cập nhật' : 'Tạo mới'" class="btn-gradient" :loading="saving" @click="handleSubmit" />
      </div>
    </template>
  </Dialog>
</template>
