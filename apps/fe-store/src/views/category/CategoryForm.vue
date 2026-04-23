<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { categoryService, type Category, type CreateCategoryDto } from '@/services/category.service'
import { useFormDraftStore } from '@/stores/form-draft.store'
import { useAppToast } from '@/composables/useToast'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'

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
const draftStore = useFormDraftStore()
const saving = ref(false)
const imagePreview = ref('')
const fileInput = ref<HTMLInputElement>()
const cloneDraftValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const createEmptyForm = (): CreateCategoryDto & { slug?: string } => ({
  name: '',
  slug: '',
  description: '',
  image_url: '',
  parent_id: null,
  sort_order: 0,
  is_active: true,
})

const form = ref<CreateCategoryDto & { slug?: string }>(createEmptyForm())

const isEdit = computed(() => !!props.category?.id)
const draftKey = computed(() => isEdit.value ? `category:edit:${props.category?.id}` : 'category:create')
const title = computed(() => isEdit.value ? `Chỉnh sửa: ${props.category?.name}` : 'Thêm danh mục mới')
const subtitle = computed(() => isEdit.value
  ? 'Cập nhật thông tin chi tiết và cấu hình hiển thị.'
  : 'Cung cấp thông tin chi tiết cho danh mục mới của bạn.'
)

const parentOptions = computed(() => [
  { label: 'Không có (Là danh mục gốc)', value: null },
  ...props.categories
    .filter(c => c.id !== props.category?.id)
    .map(c => ({ label: c.name, value: c.id }))
])

// Auto-generate slug from name
watch(() => form.value.name, (val) => {
  if (!isEdit.value) {
    form.value.slug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
})

watch(() => props.visible, (val) => {
  if (!val) return

  if (props.category) {
    form.value = {
      name: props.category.name,
      slug: (props.category as any).slug || '',
      description: props.category.description || '',
      image_url: props.category.image_url || '',
      parent_id: props.category.parent_id || null,
      sort_order: props.category.sort_order || 0,
      is_active: props.category.is_active,
    }
    imagePreview.value = props.category.image_url || ''
  } else {
    form.value = createEmptyForm()
    imagePreview.value = ''
  }

  const draft = draftStore.getDraft<{ form: typeof form.value }>(draftKey.value)
  if (draft?.form) {
    form.value = {
      ...form.value,
      ...draft.form,
    }
    imagePreview.value = form.value.image_url || imagePreview.value
  }
})

const selectedFile = ref<File | null>(null)

const onImageSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  selectedFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

const buildFormData = () => {
  const fd = new FormData()
  fd.append('name', form.value.name)
  if (form.value.slug) fd.append('slug', form.value.slug)
  if (form.value.description) fd.append('description', form.value.description)
  if (form.value.parent_id) fd.append('parent_id', form.value.parent_id)
  fd.append('sort_order', String(form.value.sort_order || 0))
  fd.append('is_active', String(form.value.is_active))
  // File upload takes priority over URL text
  if (selectedFile.value) {
    fd.append('image', selectedFile.value)
  } else if (form.value.image_url) {
    fd.append('image_url', form.value.image_url)
  }
  return fd
}

const handleSubmit = async () => {
  if (!form.value.name.trim()) {
    toast.warn('Tên danh mục không được để trống')
    return
  }
  saving.value = true
  try {
    const fd = buildFormData()
    if (isEdit.value) {
      await categoryService.update(props.category!.id, fd)
      toast.success('Cập nhật thành công')
    } else {
      await categoryService.create(fd)
      toast.success('Tạo danh mục thành công')
    }
    draftStore.clearDraft(draftKey.value)
    selectedFile.value = null
    emit('saved')
  } catch (err: any) {
    toast.error('Lỗi', err.response?.data?.message || 'Thao tác thất bại')
  } finally {
    saving.value = false
  }
}

const close = () => emit('update:visible', false)

watch(
  [form, () => props.visible],
  ([, visible]) => {
    if (!visible) return

    draftStore.setDraft(draftKey.value, {
      form: cloneDraftValue(form.value),
    })
  },
  { deep: true },
)
</script>

<template>
  <!-- Overlay -->
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="visible" class="drawer-overlay" @click.self="close" />
    </Transition>

    <Transition name="drawer">
      <aside v-if="visible" class="drawer">
        <!-- Drawer Header -->
        <div class="drawer-header">
          <div>
            <h2 class="drawer-title">{{ title }}</h2>
            <p class="drawer-subtitle">{{ subtitle }}</p>
          </div>
          <button class="drawer-close" @click="close">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <!-- Drawer Body -->
        <div class="drawer-body">
          <form @submit.prevent="handleSubmit">
            <!-- Name -->
            <div class="form-field">
              <label class="field-label">TÊN DANH MỤC <span class="req">*</span></label>
              <InputText
                v-model="form.name"
                placeholder="Vd: Thiết bị điện tử"
                class="w-full"
                id="cat-name"
              />
            </div>

            <!-- Slug -->
            <div class="form-field">
              <label class="field-label">SLUG</label>
              <div class="slug-wrap">
                <InputText v-model="(form as any).slug" placeholder="thiet-bi-dien-tu" class="w-full slug-input" />
                <span class="slug-badge">AUTO-GEN</span>
              </div>
              <p class="field-hint">Dùng để tạo đường dẫn thân thiện cho SEO.</p>
            </div>

            <!-- Parent -->
            <div class="form-field">
              <label class="field-label">DANH MỤC CHA</label>
              <Select
                v-model="form.parent_id"
                :options="parentOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
              />
            </div>

            <!-- Description -->
            <div class="form-field">
              <label class="field-label">MÔ TẢ</label>
              <Textarea
                v-model="form.description"
                rows="4"
                placeholder="Nhập mô tả ngắn cho danh mục này..."
                class="w-full"
              />
            </div>

            <!-- Image -->
            <div class="form-field">
              <label class="field-label">ẢNH ĐẠI DIỆN</label>
              <div class="image-row">
                <div class="image-preview">
                  <img v-if="imagePreview" :src="imagePreview" />
                  <i v-else class="pi pi-image" style="font-size: 1.2rem; color: #D1D5DB"></i>
                </div>
                <div class="image-actions">
                  <button type="button" class="upload-btn" @click="fileInput?.click()">
                    <i class="pi pi-cloud-upload"></i>
                    Tải lên hình ảnh
                  </button>
                  <p class="field-hint">Dung lượng tối đa 2MB. Định dạng: JPG, PNG, WEBP.</p>
                  <!-- Also allow URL input -->
                  <InputText v-model="form.image_url" placeholder="Hoặc nhập URL ảnh..." class="w-full mt-2" style="font-size: 0.78rem" />
                </div>
              </div>
              <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onImageSelect" />
            </div>

            <!-- Sort + Status -->
            <div class="form-row-2">
              <div class="form-field">
                <label class="field-label">THỨ TỰ HIỂN THỊ</label>
                <InputNumber v-model="form.sort_order" class="w-full" :min="0" />
                <p class="field-hint">Số nhỏ hơn sẽ hiển thị trước trên website.</p>
              </div>
              <div class="form-field">
                <label class="field-label">TRẠNG THÁI</label>
                <div class="status-toggle-wrap">
                  <ToggleSwitch v-model="form.is_active" />
                  <span class="status-text" :class="form.is_active ? 'text-active' : 'text-inactive'">
                    {{ form.is_active ? 'Hoạt động' : 'Tắt' }}
                  </span>
                </div>
              </div>
            </div>
          </form>
        </div>

        <!-- Drawer Footer -->
        <div class="drawer-footer">
          <button type="button" class="save-btn" :disabled="saving" @click="handleSubmit">
            <i v-if="saving" class="pi pi-spin pi-spinner"></i>
            <i v-else class="pi pi-save"></i>
            {{ isEdit ? 'Lưu thay đổi' : 'Lưu danh mục' }}
          </button>
          <button type="button" class="cancel-btn" @click="close">Hủy bỏ</button>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ═══ Overlay ═══ */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 900;
  backdrop-filter: blur(2px);
}

/* ═══ Drawer ═══ */
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 480px;
  max-width: 100vw;
  background: #fff;
  z-index: 901;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.12);
}

/* Transitions */
.overlay-enter-active, .overlay-leave-active { transition: opacity 0.25s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.drawer-enter-active, .drawer-leave-active { transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1); }
.drawer-enter-from, .drawer-leave-to { transform: translateX(100%); }

/* ═══ Header ═══ */
.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 20px;
  border-bottom: 1px solid #F3F4F6;
  flex-shrink: 0;
}
.drawer-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}
.drawer-subtitle {
  font-size: 0.78rem;
  color: #9CA3AF;
  margin-top: 4px;
}
.drawer-close {
  width: 32px; height: 32px;
  border: none; background: #F3F4F6;
  border-radius: 8px; cursor: pointer;
  color: #6B7280; font-size: 0.75rem;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0;
}
.drawer-close:hover { background: #E5E7EB; color: var(--text-primary); }

/* ═══ Body ═══ */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

/* ═══ Form Fields ═══ */
.form-field {
  margin-bottom: 18px;
}
.field-label {
  display: block;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #9CA3AF;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.req { color: #EF4444; }
.field-hint {
  font-size: 0.68rem;
  color: #9CA3AF;
  margin-top: 5px;
  line-height: 1.5;
}
.w-full { width: 100%; }
.mt-2 { margin-top: 8px; }

/* Slug */
.slug-wrap { position: relative; }
.slug-input { font-family: monospace; font-size: 0.82rem; color: #6B7280; }
.slug-badge {
  position: absolute;
  right: 10px; top: 50%;
  transform: translateY(-50%);
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--primary);
  background: #FFF7ED;
  padding: 2px 7px;
  border-radius: 4px;
  pointer-events: none;
}

/* Image */
.image-row { display: flex; gap: 14px; align-items: flex-start; }
.image-preview {
  width: 72px; height: 72px;
  border-radius: 10px;
  background: #F9FAFB;
  border: 1.5px dashed #D1D5DB;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; overflow: hidden;
}
.image-preview img { width: 100%; height: 100%; object-fit: cover; }
.image-actions { flex: 1; }
.upload-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  background: #F3F4F6; color: var(--text-primary);
  border: none; border-radius: 8px;
  font-size: 0.78rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
  width: 100%; justify-content: center;
}
.upload-btn:hover { background: #E5E7EB; }
.hidden { display: none; }

/* Row 2 cols */
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.status-toggle-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.status-text { font-size: 0.85rem; font-weight: 600; }
.text-active { color: #10B981; }
.text-inactive { color: #9CA3AF; }

/* ═══ Footer ═══ */
.drawer-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #F3F4F6;
  flex-shrink: 0;
}
.save-btn {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(to right, var(--primary), var(--gold));
  color: #fff;
  border: none; border-radius: 10px;
  font-size: 0.88rem; font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
}
.save-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.cancel-btn {
  padding: 12px 20px;
  border: 1.5px solid var(--border);
  background: transparent;
  border-radius: 10px;
  font-size: 0.85rem; font-weight: 600;
  color: #6B7280; cursor: pointer;
  transition: all 0.2s;
}
.cancel-btn:hover { background: #F9FAFB; }

@media (max-width: 560px) {
  .drawer { width: 100vw; }
}
</style>
