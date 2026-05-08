<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { attributeService, type Attribute } from '@/services/attribute.service'
import { useAppToast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import InputText from 'primevue/inputtext'

const route = useRoute()
const router = useRouter()
const toast = useAppToast()

const loading = ref(true)
const saving = ref(false)
const attribute = ref<Attribute | null>(null)
const showDeleteConfirm = ref(false)

const name = ref('')
const values = ref<Array<{ id?: string; value: string; color_hex: string | null }>>([])

const fetchData = async () => {
  loading.value = true
  try {
    const { data } = await attributeService.getById(route.params.id as string)
    attribute.value = data.data

    name.value = attribute.value!.name
    values.value = attribute.value!.values?.length
      ? attribute.value!.values.map(v => ({ id: v.id, value: v.value, color_hex: v.color_hex || null }))
      : [{ value: '', color_hex: null }]
  } catch {
    toast.error('Không thể tải thuộc tính')
    router.push('/attributes')
  } finally {
    loading.value = false
  }
}

const validCount = computed(() => values.value.filter(v => v.value.trim()).length)

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
    // Update name
    if (name.value !== attribute.value!.name) {
      await attributeService.update(attribute.value!.id, { name: name.value })
    }

    // Sync values
    const existingIds = attribute.value!.values.map(v => v.id)
    for (const val of validValues) {
      if (val.id && existingIds.includes(val.id)) {
        await attributeService.updateValue(attribute.value!.id, val.id, {
          value: val.value,
          color_hex: val.color_hex,
        })
      } else {
        await attributeService.createValue(attribute.value!.id, {
          value: val.value,
          color_hex: val.color_hex,
        })
      }
    }
    // Delete removed values
    const keptIds = validValues.filter(v => v.id).map(v => v.id)
    for (const existingVal of attribute.value!.values) {
      if (!keptIds.includes(existingVal.id)) {
        await attributeService.deleteValue(attribute.value!.id, existingVal.id)
      }
    }

    toast.success('Cập nhật thành công')
    router.push('/attributes')
  } catch (err: any) {
    toast.error('Lỗi', err.response?.data?.message || 'Cập nhật thất bại')
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  try {
    await attributeService.delete(route.params.id as string)
    toast.success('Đã xóa thuộc tính')
    router.push('/attributes')
  } catch {
    toast.error('Xóa thất bại')
  }
}

onMounted(fetchData)
</script>

<template>
  <div v-if="loading" class="loading-wrap">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
  </div>

  <div v-else-if="attribute" class="edit-page">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <router-link to="/dashboard" class="bc-link">DASHBOARD</router-link>
      <i class="pi pi-chevron-right bc-sep"></i>
      <router-link to="/attributes" class="bc-link">ATTRIBUTES</router-link>
      <i class="pi pi-chevron-right bc-sep"></i>
      <span class="bc-current">EDIT ATTRIBUTE</span>
    </div>

    <!-- Page Title -->
    <h1 class="edit-title">
      Chỉnh sửa Thuộc tính: <span class="title-highlight">{{ attribute.name }}</span>
    </h1>
    <p class="edit-subtitle">
      Cập nhật tên và quản lý danh sách các giá trị lựa chọn cho thuộc tính này.
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

            <div class="form-field">
              <label class="field-label">TÊN THUỘC TÍNH</label>
              <div class="name-input-wrap">
                <InputText v-model="name" placeholder="Ví dụ: Màu sắc, Kích cỡ..." class="w-full" />
                <span class="required-tag">* Bắt buộc</span>
              </div>
            </div>
          </div>

          <!-- Section: Danh sách giá trị -->
          <div class="app-card form-section">
            <div class="section-head values-header">
              <div class="flex items-center gap-10">
                <i class="pi pi-list section-icon"></i>
                <span class="section-label">Danh sách giá trị</span>
              </div>
              <span class="values-count">{{ validCount }} GIÁ TRỊ</span>
            </div>

            <div class="values-list">
              <div v-for="(val, i) in values" :key="i" class="value-row">
                <InputText
                  v-model="val.value"
                  :placeholder="i === values.length - 1 ? 'Thêm giá trị mới...' : 'Giá trị'"
                  class="value-input"
                />
                <label class="color-picker-wrap" :title="val.color_hex || 'Chọn màu'">
                  <input type="color" v-model="val.color_hex" class="color-input" />
                  <div class="color-preview" :style="val.color_hex ? { background: val.color_hex } : {}">
                    <i v-if="!val.color_hex" class="pi pi-palette" style="font-size: 0.7rem; color: #9CA3AF"></i>
                  </div>
                </label>
                <button type="button" class="remove-val-btn" :disabled="values.length <= 1" @click="removeRow(i)">
                  <i class="pi pi-times"></i>
                </button>
              </div>
            </div>

            <!-- Add value -->
            <button type="button" class="add-value-btn mt-4" @click="addRow">
              <i class="pi pi-plus-circle" style="font-size: 1rem; color: var(--primary)"></i>
              <span>+ Thêm giá trị mới</span>
            </button>
          </div>

          <!-- Footer Actions -->
          <div class="form-footer">
            <button type="button" class="delete-btn" @click="showDeleteConfirm = true">
              <i class="pi pi-trash"></i>
              Xóa thuộc tính
            </button>
            <div class="form-footer-right">
              <button type="button" class="cancel-btn" @click="router.push('/attributes')">Hủy bỏ</button>
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
        <!-- Quick Stats -->
        <div class="sidebar-card">
          <div class="sidebar-stat-row">
            <span class="sidebar-stat-label">Tổng số giá trị</span>
            <span class="sidebar-stat-value accent">{{ attribute.values?.length || 0 }}</span>
          </div>
          <div class="sidebar-stat-row">
            <span class="sidebar-stat-label">Sản phẩm liên kết</span>
            <span class="sidebar-stat-value">—</span>
          </div>
        </div>

        <!-- History -->
        <div class="sidebar-card">
          <p class="sidebar-section-title">LỊCH SỬ CẬP NHẬT</p>
          <div class="history-item">
            <div class="history-icon"><i class="pi pi-clock"></i></div>
            <div>
              <p class="history-text">Đã tạo thuộc tính</p>
              <p class="history-date">{{ formatDate(attribute.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      :message="`Xác nhận xóa thuộc tính &quot;${attribute.name}&quot;? Hành động này không thể hoàn tác.`"
      severity="danger"
      confirmLabel="Xóa thuộc tính"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.loading-wrap { display: flex; align-items: center; justify-content: center; min-height: 400px; }
.edit-page { width: 100%; }

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
.w-full { width: 100%; }

.name-input-wrap { position: relative; }
.required-tag {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  font-size: 0.62rem; font-weight: 700; color: var(--primary);
  pointer-events: none;
}

/* Values Header */
.values-header { justify-content: space-between; }
.values-count {
  padding: 3px 10px; border-radius: 20px;
  background: #FFF7ED; color: var(--primary);
  font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em;
}
.flex { display: flex; }
.items-center { align-items: center; }
.gap-10 { gap: 10px; }

/* Value rows */
.values-list { display: flex; flex-direction: column; gap: 10px; }
.value-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; background: #F9FAFB; border: 1.5px solid #E5E7EB;
  border-radius: 10px; transition: border-color 0.2s;
}
.value-row:focus-within { border-color: var(--primary); background: #fff; }
.value-input {
  flex: 1; border: none; background: transparent;
  font-size: 0.88rem; font-family: inherit; outline: none;
  padding: 0; color: var(--text-primary);
}
.value-input::placeholder { color: #D1D5DB; }

/* Color picker */
.color-picker-wrap { position: relative; cursor: pointer; flex-shrink: 0; }
.color-input {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  opacity: 0; cursor: pointer;
}
.color-preview {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid #E5E7EB; display: flex; align-items: center;
  justify-content: center; background: #F3F4F6; transition: all 0.2s;
}

.remove-val-btn {
  width: 28px; height: 28px; border: none; background: transparent;
  border-radius: 6px; cursor: pointer; color: #D1D5DB; font-size: 0.75rem;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0;
}
.remove-val-btn:hover:not(:disabled) { color: #EF4444; background: #FEF2F2; }
.remove-val-btn:disabled { opacity: 0.3; cursor: default; }

/* Add value button */
.mt-4 { margin-top: 16px; }
.add-value-btn {
  width: 100%; display: flex; align-items: center; justify-content: center;
  gap: 8px; padding: 14px;
  border: 2px dashed #FFCDB2; border-radius: 10px;
  background: transparent; cursor: pointer;
  font-size: 0.82rem; font-weight: 600; color: var(--primary);
  transition: all 0.2s;
}
.add-value-btn:hover { background: #FFF9F5; border-color: var(--primary); }

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

/* History */
.history-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.history-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: #F3F4F6; display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; color: #9CA3AF; flex-shrink: 0;
}
.history-text { font-size: 0.78rem; font-weight: 600; color: var(--text-primary); }
.history-date { font-size: 0.68rem; color: #9CA3AF; margin-top: 2px; }

@media (max-width: 900px) {
  .edit-grid { grid-template-columns: 1fr; }
  .edit-sidebar { position: static; }
}
</style>
