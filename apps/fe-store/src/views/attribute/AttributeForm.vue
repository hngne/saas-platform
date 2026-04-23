<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { attributeService, type Attribute } from '@/services/attribute.service'
import { useAppToast } from '@/composables/useToast'
import InputText from 'primevue/inputtext'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const toast = useAppToast()
const saving = ref(false)
const name = ref('')
const values = ref<Array<{ value: string; color_hex: string | null }>>([
  { value: '', color_hex: null },
])

const title = 'Thêm thuộc tính mới'
const subtitle = 'Vui lòng nhập đầy đủ thông tin để định nghĩa thuộc tính mới cho hệ thống hàng hóa.'
const validCount = computed(() => values.value.filter(v => v.value.trim()).length)

// Re-init on open
watch(() => props.visible, (val) => {
  if (val) {
    name.value = ''
    values.value = [{ value: '', color_hex: null }]
  }
})

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
    await attributeService.create({
      name: name.value,
      values: validValues.map(v => ({ value: v.value, color_hex: v.color_hex })),
    })
    toast.success('Tạo thuộc tính thành công')
    emit('saved')
  } catch (err: any) {
    toast.error('Lỗi', err.response?.data?.message || 'Thao tác thất bại')
  } finally {
    saving.value = false
  }
}

const close = () => emit('update:visible', false)
</script>

<template>
  <!-- Overlay -->
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="visible" class="drawer-overlay" @click.self="close" />
    </Transition>

    <Transition name="drawer">
      <aside v-if="visible" class="drawer">
        <!-- Header -->
        <div class="drawer-header">
          <div>
            <h2 class="drawer-title">{{ title }}</h2>
            <p class="drawer-subtitle">{{ subtitle }}</p>
          </div>
          <button class="drawer-close" @click="close">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="drawer-body">
          <form @submit.prevent="handleSubmit">
            <!-- Name -->
            <div class="form-field">
              <label class="field-label">TÊN THUỘC TÍNH</label>
              <div class="name-input-wrap">
                <InputText v-model="name" placeholder="Ví dụ: Màu sắc, Kích cỡ..." class="w-full" />
                <span class="required-tag">* Bắt buộc</span>
              </div>
            </div>

            <!-- Values -->
            <div class="form-field">
              <div class="values-header">
                <label class="field-label">DANH SÁCH GIÁ TRỊ</label>
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
                      <i v-if="!val.color_hex" class="pi pi-palette" style="font-size: 0.7rem"></i>
                    </div>
                  </label>
                  <button type="button" class="remove-val-btn" :disabled="values.length <= 1" @click="removeRow(i)">
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              </div>

              <!-- Add value -->
              <button type="button" class="add-value-btn" @click="addRow">
                <i class="pi pi-plus-circle" style="font-size: 1rem; color: var(--primary)"></i>
                <span>+ Thêm giá trị</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="drawer-footer">
          <button type="button" class="cancel-btn" @click="close">Hủy bỏ</button>
          <button type="button" class="save-btn" :disabled="saving" @click="handleSubmit">
            <i v-if="saving" class="pi pi-spin pi-spinner"></i>
            Lưu thuộc tính
          </button>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ═══ Overlay ═══ */
.drawer-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.35); z-index: 900;
  backdrop-filter: blur(2px);
}

/* ═══ Drawer ═══ */
.drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 480px; max-width: 100vw;
  background: #fff; z-index: 901;
  display: flex; flex-direction: column;
  box-shadow: -8px 0 40px rgba(0,0,0,0.12);
}

/* Transitions */
.overlay-enter-active, .overlay-leave-active { transition: opacity 0.25s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }
.drawer-enter-active, .drawer-leave-active { transition: transform 0.28s cubic-bezier(0.4,0,0.2,1); }
.drawer-enter-from, .drawer-leave-to { transform: translateX(100%); }

/* ═══ Header ═══ */
.drawer-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px 24px 20px; border-bottom: 1px solid #F3F4F6; flex-shrink: 0;
}
.drawer-title { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); }
.drawer-subtitle { font-size: 0.78rem; color: #9CA3AF; margin-top: 4px; max-width: 340px; line-height: 1.5; }
.drawer-close {
  width: 32px; height: 32px; border: none; background: #F3F4F6;
  border-radius: 8px; cursor: pointer; color: #6B7280; font-size: 0.75rem;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0;
}
.drawer-close:hover { background: #E5E7EB; color: var(--text-primary); }

/* ═══ Body ═══ */
.drawer-body { flex: 1; overflow-y: auto; padding: 20px 24px; }

/* ═══ Form ═══ */
.form-field { margin-bottom: 24px; }
.field-label { display: block; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; color: #9CA3AF; text-transform: uppercase; margin-bottom: 8px; }
.w-full { width: 100%; }

.name-input-wrap { position: relative; }
.required-tag {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  font-size: 0.62rem; font-weight: 700; color: var(--primary);
  pointer-events: none;
}

.values-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.values-count {
  padding: 3px 10px; border-radius: 20px;
  background: #FFF7ED; color: var(--primary);
  font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em;
}

/* Value rows */
.values-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
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
.drawer-footer {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 24px; border-top: 1px solid #F3F4F6; flex-shrink: 0;
}
.cancel-btn {
  padding: 12px 20px; border: none; background: transparent;
  font-size: 0.85rem; font-weight: 600; color: #6B7280; cursor: pointer;
}
.cancel-btn:hover { color: var(--text-primary); }
.save-btn {
  flex: 1; display: flex; align-items: center; justify-content: center;
  gap: 8px; padding: 12px 20px;
  background: linear-gradient(to right, var(--primary), var(--gold));
  color: #fff; border: none; border-radius: 10px;
  font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.save-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 560px) {
  .drawer { width: 100vw; }
}
</style>
