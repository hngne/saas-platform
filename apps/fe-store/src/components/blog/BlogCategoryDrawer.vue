<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import { blogCategoryService, type BlogCategory, type CreateBlogCategoryDto } from '@/services/blog-category.service'
import { useAppToast } from '@/composables/useToast'

const props = defineProps<{
  visible: boolean
  category: BlogCategory | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const toast = useAppToast()
const saving = ref(false)

const isEdit = computed(() => !!props.category?.id)

const form = ref<CreateBlogCategoryDto>({
  name: '',
  is_active: true,
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return

    if (props.category) {
      form.value = {
        name: props.category.name,
        is_active: props.category.is_active,
      }
      return
    }

    form.value = {
      name: '',
      is_active: true,
    }
  },
)

const close = () => emit('update:visible', false)

const handleSubmit = async () => {
  if (!form.value.name?.trim()) {
    toast.warn('Tên danh mục blog không được để trống')
    return
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await blogCategoryService.update(props.category!.id, {
        name: form.value.name.trim(),
        is_active: form.value.is_active,
      })
      toast.success('Đã cập nhật danh mục blog')
    } else {
      await blogCategoryService.create({
        name: form.value.name.trim(),
        is_active: form.value.is_active,
      })
      toast.success('Đã tạo danh mục blog')
    }
    emit('saved')
  } catch (error: any) {
    toast.error('Lỗi', error?.response?.data?.message || 'Không thể lưu danh mục blog')
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
    position="right"
    :draggable="false"
    :closable="true"
    class="category-drawer"
    :style="{ width: '520px', maxWidth: '100vw', height: '100vh', margin: 0 }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="drawer-header">
        <p class="drawer-overline">Blog category</p>
        <h3 class="drawer-title">{{ isEdit ? 'Chỉnh sửa danh mục blog' : 'Thêm danh mục blog' }}</h3>
      </div>
    </template>

    <div class="drawer-body">
      <div class="preview-card">
        <span class="preview-label">Slug tự tạo theo tên</span>
        <strong>{{ form.name || 'Danh mục mới' }}</strong>
        <p>{{ form.is_active ? 'Danh mục đang sẵn sàng để gắn bài viết.' : 'Danh mục đang ở trạng thái tạm ẩn.' }}</p>
      </div>

      <div class="field-stack">
        <label>Tên danh mục</label>
        <InputText v-model="form.name" class="w-full" placeholder="Ví dụ: Tin khuyến mãi" />
      </div>

      <div class="activation-card">
        <div>
          <strong>Trạng thái</strong>
          <p>Bật nếu muốn danh mục có thể dùng ngay trong form bài viết.</p>
        </div>
        <ToggleSwitch v-model="form.is_active" />
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <button type="button" class="footer-link" @click="close">Hủy</button>
        <Button
          :label="isEdit ? 'Lưu danh mục' : 'Tạo danh mục'"
          class="btn-create-unified"
          :loading="saving"
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.category-drawer :deep(.p-dialog-header),
.category-drawer :deep(.p-dialog-footer) {
  padding: 0;
  border: none;
}

.category-drawer :deep(.p-dialog-content) {
  padding: 0;
}

.category-drawer :deep(.p-dialog) {
  border-radius: 0;
}

.drawer-header {
  width: 100%;
  padding: 24px 24px 16px;
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
  margin-top: 8px;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  color: #111827;
}

.drawer-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.preview-card {
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.08), rgba(255, 214, 10, 0.12));
  border: 1px solid rgba(255, 107, 43, 0.14);
}

.preview-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c2410c;
}

.preview-card strong {
  display: block;
  margin-top: 8px;
  font-size: 1.2rem;
  color: #111827;
}

.preview-card p {
  margin-top: 8px;
  color: #64748b;
  line-height: 1.7;
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-stack label {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #3f2a21;
}

.field-stack :deep(.p-inputtext) {
  min-height: 52px;
  border-radius: 16px;
  border-color: #e2e8f0;
  background: #f8fbff;
}

.activation-card {
  padding: 18px 20px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.08), rgba(255, 221, 180, 0.22));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.activation-card strong {
  display: block;
  color: #111827;
}

.activation-card p {
  margin-top: 4px;
  color: #7c5e51;
  line-height: 1.65;
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px 24px;
  border-top: 1px solid #edf2f7;
}

.footer-link {
  border: none;
  background: transparent;
  color: #475569;
  font-weight: 700;
}

.footer-link:hover {
  color: var(--primary);
}
</style>
