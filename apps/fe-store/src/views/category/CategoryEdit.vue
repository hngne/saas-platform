<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { categoryService, type Category } from '@/services/category.service'
import { useFormDraftStore } from '@/stores/form-draft.store'
import { useAppToast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'

const route = useRoute()
const router = useRouter()
const toast = useAppToast()
const draftStore = useFormDraftStore()
const cloneDraftValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const loading = ref(true)
const saving = ref(false)
const category = ref<Category | null>(null)
const categories = ref<Category[]>([])
const showDeleteConfirm = ref(false)
const imagePreview = ref('')

const form = ref({
  name: '',
  slug: '',
  description: '',
  image_url: '',
  parent_id: null as string | null,
  sort_order: 0,
  is_active: true,
})

const draftKey = computed(() => `category:edit:${route.params.id}`)

const parentOptions = computed(() => [
  { label: 'Không có (Danh mục gốc)', value: null },
  ...categories.value
    .filter(c => c.id !== route.params.id)
    .map(c => ({ label: c.name, value: c.id }))
])

// Auto-gen slug when editing name
watch(() => form.value.name, (val) => {
  form.value.slug = val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
})

const restoreDraft = () => {
  const draft = draftStore.getDraft<{ form: typeof form.value }>(draftKey.value)
  if (!draft?.form) return

  form.value = {
    ...form.value,
    ...draft.form,
  }
  imagePreview.value = form.value.image_url || imagePreview.value
}

const fetchData = async () => {
  loading.value = true
  try {
    const [catRes, allRes] = await Promise.all([
      categoryService.getById(route.params.id as string),
      categoryService.getAll(),
    ])
    category.value = catRes.data.data
    categories.value = allRes.data.data || []

    const c = category.value!
    form.value = {
      name: c.name,
      slug: (c as any).slug || '',
      description: c.description || '',
      image_url: c.image_url || '',
      parent_id: c.parent_id || null,
      sort_order: c.sort_order || 0,
      is_active: c.is_active,
    }
    imagePreview.value = c.image_url || ''
    restoreDraft()
  } catch {
    toast.error('Không thể tải danh mục')
    router.push('/categories')
  } finally {
    loading.value = false
  }
}

const selectedFile = ref<File | null>(null)

const buildFormData = () => {
  const fd = new FormData()
  fd.append('name', form.value.name)
  if (form.value.slug) fd.append('slug', form.value.slug)
  if (form.value.description) fd.append('description', form.value.description)
  if (form.value.parent_id) fd.append('parent_id', form.value.parent_id)
  fd.append('sort_order', String(form.value.sort_order || 0))
  fd.append('is_active', String(form.value.is_active))
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
    await categoryService.update(route.params.id as string, fd)
    toast.success('Cập nhật thành công')
    draftStore.clearDraft(draftKey.value)
    router.push('/categories')
  } catch (err: any) {
    toast.error('Lỗi', err.response?.data?.message || 'Cập nhật thất bại')
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  try {
    await categoryService.delete(route.params.id as string)
    toast.success('Đã xóa danh mục')
    draftStore.clearDraft(draftKey.value)
    router.push('/categories')
  } catch {
    toast.error('Xóa thất bại')
  }
}

// Image
const fileInput = ref<HTMLInputElement>()
const onImageSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  selectedFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

watch(
  form,
  () => {
    if (loading.value) return

    draftStore.setDraft(draftKey.value, {
      form: cloneDraftValue(form.value),
    })
  },
  { deep: true },
)

onMounted(fetchData)
</script>

<template>
  <div v-if="loading" class="loading-wrap">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
  </div>

  <div v-else-if="category" class="edit-page">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <router-link to="/dashboard" class="bc-link">DASHBOARD</router-link>
      <i class="pi pi-chevron-right bc-sep"></i>
      <router-link to="/categories" class="bc-link">CATEGORIES</router-link>
      <i class="pi pi-chevron-right bc-sep"></i>
      <span class="bc-current">EDIT CATEGORY</span>
    </div>

    <!-- Page Title -->
    <h1 class="edit-title">
      Chỉnh sửa Danh mục: <span class="title-highlight">{{ category.name }}</span>
    </h1>
    <p class="edit-subtitle">
      Cập nhật thông tin chi tiết và cấu hình hiển thị cho phân loại {{ category.name.toLowerCase() }}.
    </p>

    <!-- Main Grid: Form + Sidebar -->
    <div class="edit-grid">
      <!-- LEFT: Form -->
      <div class="edit-form">
        <form @submit.prevent="handleSubmit">
          <!-- Section: Thông tin cơ bản -->
          <div class="app-card form-section">
            <div class="section-head">
              <i class="pi pi-info-circle section-icon"></i>
              <span class="section-label">Thông tin cơ bản</span>
            </div>

            <div class="field-row-2">
              <div class="form-field">
                <label class="field-label">TÊN DANH MỤC</label>
                <InputText v-model="form.name" class="w-full" />
              </div>
              <div class="form-field">
                <label class="field-label">SLUG HỆ THỐNG</label>
                <div class="slug-wrap">
                  <InputText v-model="form.slug" class="w-full slug-input" />
                  <span class="slug-link-icon"><i class="pi pi-link"></i></span>
                </div>
              </div>
            </div>

            <div class="form-field mt-4">
              <label class="field-label">DANH MỤC CHA</label>
              <Select
                v-model="form.parent_id"
                :options="parentOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
              />
            </div>

            <div class="form-field mt-4">
              <label class="field-label">MÔ TẢ</label>
              <Textarea v-model="form.description" rows="3" class="w-full" placeholder="Mô tả cho danh mục..." />
            </div>
          </div>

          <!-- Section: Cấu hình hiển thị -->
          <div class="app-card form-section">
            <div class="section-head">
              <i class="pi pi-cog section-icon"></i>
              <span class="section-label">Cấu hình hiển thị</span>
            </div>

            <div class="config-row">
              <div class="form-field" style="flex: 0 0 180px;">
                <label class="field-label">THỨ TỰ SẮP XẾP</label>
                <InputNumber v-model="form.sort_order" :min="0" class="w-full" />
                <p class="field-hint">Số nhỏ hơn sẽ hiển thị trước trên website.</p>
              </div>

              <div class="status-card">
                <div class="status-dot-wrap">
                  <div class="status-dot" :class="form.is_active ? 'dot-on' : 'dot-off'"></div>
                </div>
                <div class="status-info">
                  <p class="status-title">Trạng thái hoạt động</p>
                  <p class="status-desc">Hiển thị danh mục trên cửa hàng</p>
                </div>
                <ToggleSwitch v-model="form.is_active" />
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="form-footer">
            <button type="button" class="delete-btn" @click="showDeleteConfirm = true">
              <i class="pi pi-trash"></i>
              Xóa danh mục
            </button>
            <div class="form-footer-right">
              <button type="button" class="cancel-btn" @click="router.push('/categories')">Hủy bỏ</button>
              <button type="submit" class="save-btn" :disabled="saving">
                <i v-if="saving" class="pi pi-spin pi-spinner"></i>
                <i v-else class="pi pi-save"></i>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- RIGHT: Sidebar -->
      <div class="edit-sidebar">
        <!-- Banner Preview -->
        <div class="banner-card" :style="imagePreview ? { backgroundImage: `url(${imagePreview})` } : {}">
          <div class="banner-overlay">
            <button type="button" class="banner-edit-btn" @click="fileInput?.click()">
              <i class="pi pi-pencil"></i>
            </button>
            <p class="banner-label">BANNER XEM TRƯỚC</p>
            <p class="banner-name">{{ form.name || 'Tên danh mục' }}</p>
          </div>
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onImageSelect" />
        </div>

        <!-- URL input -->
        <div class="sidebar-card">
          <label class="field-label">URL HÌNH ẢNH</label>
          <InputText v-model="form.image_url" placeholder="https://..." class="w-full" style="font-size: 0.78rem" />
        </div>

        <!-- Quick Stats -->
        <div class="sidebar-card">
          <div class="sidebar-stat-row">
            <span class="sidebar-stat-label">Sản phẩm liên kết</span>
            <span class="sidebar-stat-value">—</span>
          </div>
          <div class="sidebar-stat-row">
            <span class="sidebar-stat-label">Lượt xem (30 ngày)</span>
            <span class="sidebar-stat-value accent">—</span>
          </div>

          <p class="sidebar-section-title">THỐNG KÊ NHANH</p>
          <div class="mini-stats-row">
            <div class="mini-stat">
              <p class="mini-stat-label">Tỉ lệ chuyển đổi</p>
              <p class="mini-stat-value">—</p>
            </div>
            <div class="mini-stat">
              <p class="mini-stat-label">Doanh thu</p>
              <p class="mini-stat-value accent">—</p>
            </div>
          </div>
        </div>

        <!-- History -->
        <div class="sidebar-card">
          <p class="sidebar-section-title">LỊCH SỬ CẬP NHẬT</p>
          <div class="history-item">
            <div class="history-icon"><i class="pi pi-clock"></i></div>
            <div>
              <p class="history-text">Đã tạo danh mục</p>
              <p class="history-date">{{ formatDate(category.created_at) }}</p>
            </div>
          </div>
          <div class="history-item">
            <div class="history-icon"><i class="pi pi-refresh"></i></div>
            <div>
              <p class="history-text">Cập nhật lần cuối</p>
              <p class="history-date">{{ formatDate(category.updated_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      :message="`Xác nhận xóa danh mục &quot;${category.name}&quot;? Hành động này không thể hoàn tác.`"
      severity="danger"
      confirmLabel="Xóa danh mục"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.loading-wrap { display: flex; align-items: center; justify-content: center; min-height: 400px; }
.edit-page { max-width: 1200px; }

/* ═══ Breadcrumb ═══ */
.breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.bc-link { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; color: #9CA3AF; text-decoration: none; }
.bc-link:hover { color: var(--primary); }
.bc-sep { font-size: 0.5rem; color: #D1D5DB; }
.bc-current { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; color: #6B7280; }

/* ═══ Title ═══ */
.edit-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; }
.title-highlight { color: var(--primary); }
.edit-subtitle { font-size: 0.82rem; color: #9CA3AF; margin-bottom: 24px; }

/* ═══ Grid ═══ */
.edit-grid { display: grid; grid-template-columns: 1fr 300px; gap: 24px; align-items: start; }

/* ═══ Form Sections ═══ */
.form-section { padding: 24px; margin-bottom: 16px; }
.section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.section-icon { color: var(--primary); font-size: 1rem; }
.section-label { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }

.form-field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; color: #9CA3AF; text-transform: uppercase; }
.field-hint { font-size: 0.68rem; color: #9CA3AF; margin-top: 4px; }
.field-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.mt-4 { margin-top: 16px; }
.w-full { width: 100%; }

/* Slug */
.slug-wrap { position: relative; }
.slug-input { font-family: monospace; font-size: 0.82rem; color: #6B7280; }
.slug-link-icon {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  width: 28px; height: 28px; border-radius: 6px; background: #F3F4F6;
  display: flex; align-items: center; justify-content: center;
  color: #9CA3AF; font-size: 0.75rem; pointer-events: none;
}

/* Config row */
.config-row { display: flex; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
.status-card {
  flex: 1; display: flex; align-items: center; gap: 12px;
  background: #FFFBF5; border: 1px solid #FFEDD5; border-radius: 12px;
  padding: 16px 20px;
}
.status-dot-wrap { flex-shrink: 0; }
.status-dot { width: 12px; height: 12px; border-radius: 50%; }
.dot-on { background: #10B981; }
.dot-off { background: #D1D5DB; }
.status-info { flex: 1; }
.status-title { font-weight: 600; font-size: 0.85rem; color: var(--text-primary); }
.status-desc { font-size: 0.72rem; color: #9CA3AF; margin-top: 2px; }

/* ═══ Footer ═══ */
.form-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 20px; padding-bottom: 40px; gap: 16px; flex-wrap: wrap; }
.form-footer-right { display: flex; align-items: center; gap: 12px; }
.delete-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; border: 1.5px solid #FECACA; background: transparent;
  border-radius: 10px; font-size: 0.85rem; font-weight: 600;
  color: #EF4444; cursor: pointer; transition: all 0.2s;
}
.delete-btn:hover { background: #FEF2F2; }
.cancel-btn {
  padding: 10px 20px; border: none; background: transparent;
  font-size: 0.85rem; font-weight: 600; color: #6B7280; cursor: pointer;
}
.cancel-btn:hover { color: var(--text-primary); }
.save-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 24px; background: linear-gradient(to right, var(--primary), var(--gold));
  color: #fff; border: none; border-radius: 10px;
  font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.save-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* ═══ Sidebar ═══ */
.edit-sidebar { position: sticky; top: 80px; }

/* Banner */
.banner-card {
  width: 100%; aspect-ratio: 4/3; border-radius: 14px;
  background: linear-gradient(135deg, #1a1a2e, #2d1b3d); background-size: cover; background-position: center;
  overflow: hidden; position: relative; margin-bottom: 12px;
}
.banner-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.1));
  display: flex; flex-direction: column; justify-content: flex-end;
  padding: 20px;
}
.banner-edit-btn {
  position: absolute; top: 12px; right: 12px;
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,0.2); backdrop-filter: blur(4px);
  border: none; color: #fff; cursor: pointer; font-size: 0.85rem;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
}
.banner-edit-btn:hover { background: rgba(255,255,255,0.35); }
.banner-label { font-size: 0.55rem; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.6); margin-bottom: 4px; }
.banner-name { font-size: 1.1rem; font-weight: 800; color: #fff; }

.sidebar-card {
  background: #fff; border: 1px solid var(--border); border-radius: 14px;
  padding: 18px; margin-bottom: 12px;
}

.sidebar-stat-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; border-bottom: 1px solid #F3F4F6;
}
.sidebar-stat-row:last-of-type { border-bottom: none; }
.sidebar-stat-label { font-size: 0.78rem; color: #6B7280; }
.sidebar-stat-value { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); }
.sidebar-stat-value.accent { color: var(--primary); }

.sidebar-section-title { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; color: #9CA3AF; margin: 16px 0 10px; }

.mini-stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.mini-stat {
  background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 10px;
  padding: 12px; text-align: center;
}
.mini-stat-label { font-size: 0.62rem; color: #9CA3AF; margin-bottom: 4px; }
.mini-stat-value { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
.mini-stat-value.accent { color: var(--primary); }

/* History */
.history-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.history-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: #F3F4F6; display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; color: #9CA3AF; flex-shrink: 0;
}
.history-text { font-size: 0.78rem; font-weight: 600; color: var(--text-primary); }
.history-date { font-size: 0.68rem; color: #9CA3AF; margin-top: 2px; }

.hidden { display: none; }

@media (max-width: 900px) {
  .edit-grid { grid-template-columns: 1fr; }
  .edit-sidebar { position: static; }
  .field-row-2 { grid-template-columns: 1fr; }
}
</style>
