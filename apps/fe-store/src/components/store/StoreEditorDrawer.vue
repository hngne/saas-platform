<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import { storeService, type CreateStoreDto, type Store } from '@/services/store.service'
import { useAppToast } from '@/composables/useToast'

interface StoreFormState {
  name: string
  address: string
  province: string
  district: string
  ward: string
  phone: string
  latitude: number | null
  longitude: number | null
  open_time: string
  close_time: string
  is_active: boolean
}

const props = defineProps<{
  visible: boolean
  store: Store | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const toast = useAppToast()
const saving = ref(false)

const isEdit = computed(() => !!props.store?.id)

const createDefaultForm = (): StoreFormState => ({
  name: '',
  address: '',
  province: '',
  district: '',
  ward: '',
  phone: '',
  latitude: null,
  longitude: null,
  open_time: '',
  close_time: '',
  is_active: true,
})

const form = ref<StoreFormState>(createDefaultForm())

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return

    if (props.store) {
      form.value = {
        name: props.store.name || '',
        address: props.store.address || '',
        province: props.store.province || '',
        district: props.store.district || '',
        ward: props.store.ward || '',
        phone: props.store.phone || '',
        latitude: props.store.latitude ?? null,
        longitude: props.store.longitude ?? null,
        open_time: props.store.open_time || '',
        close_time: props.store.close_time || '',
        is_active: props.store.is_active,
      }
      return
    }

    form.value = createDefaultForm()
  },
)

const close = () => emit('update:visible', false)

const validateForm = () => {
  if (!form.value.name.trim()) {
    toast.warn('Tên cửa hàng không được để trống')
    return false
  }

  if (!form.value.address.trim()) {
    toast.warn('Địa chỉ cửa hàng không được để trống')
    return false
  }

  return true
}

const handleSubmit = async () => {
  if (!validateForm()) return

  const dto: CreateStoreDto = {
    name: form.value.name.trim(),
    address: form.value.address.trim(),
    province: form.value.province.trim() || null,
    district: form.value.district.trim() || null,
    ward: form.value.ward.trim() || null,
    phone: form.value.phone.trim() || null,
    latitude: form.value.latitude,
    longitude: form.value.longitude,
    open_time: form.value.open_time.trim() || null,
    close_time: form.value.close_time.trim() || null,
    is_active: form.value.is_active,
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await storeService.update(props.store!.id, dto)
      toast.success('Đã cập nhật cửa hàng')
    } else {
      await storeService.create(dto)
      toast.success('Đã tạo cửa hàng mới')
    }
    emit('saved')
  } catch (error: any) {
    toast.error('Lỗi', error?.response?.data?.message || 'Không thể lưu cửa hàng')
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
    class="store-drawer"
    :style="{ width: '640px', maxWidth: '100vw', height: '100vh', margin: 0 }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="drawer-header">
        <div>
          <p class="drawer-overline">Cửa hàng merchant</p>
          <h3 class="drawer-title">{{ isEdit ? 'Chỉnh sửa cửa hàng' : 'Thêm cửa hàng' }}</h3>
        </div>
      </div>
    </template>

    <div class="drawer-body">
      <section class="preview-card">
        <div>
          <p class="preview-overline">Preview</p>
          <h4>{{ form.name || 'Cửa hàng mới của merchant' }}</h4>
          <p>{{ form.address || 'Địa chỉ cửa hàng sẽ hiển thị ở đây sau khi bạn nhập dữ liệu.' }}</p>
        </div>

        <div class="preview-badges">
          <span class="preview-chip">{{ form.open_time || '--:--' }} - {{ form.close_time || '--:--' }}</span>
          <span class="preview-chip" :class="{ active: form.is_active }">
            {{ form.is_active ? 'Đang hoạt động' : 'Tạm ẩn' }}
          </span>
        </div>
      </section>

      <section class="field-section">
        <div class="field-stack">
          <label>Tên cửa hàng</label>
          <InputText v-model="form.name" class="w-full" placeholder="Ví dụ: ShopFlow Quận 1" />
        </div>

        <div class="field-stack">
          <label>Địa chỉ</label>
          <InputText v-model="form.address" class="w-full" placeholder="Số nhà, đường, tòa nhà..." />
        </div>

        <div class="field-grid">
          <div class="field-stack">
            <label>Tỉnh / Thành</label>
            <InputText v-model="form.province" class="w-full" placeholder="Hồ Chí Minh" />
          </div>
          <div class="field-stack">
            <label>Quận / Huyện</label>
            <InputText v-model="form.district" class="w-full" placeholder="Quận 1" />
          </div>
        </div>

        <div class="field-grid">
          <div class="field-stack">
            <label>Phường / Xã</label>
            <InputText v-model="form.ward" class="w-full" placeholder="Bến Nghé" />
          </div>
          <div class="field-stack">
            <label>Số điện thoại</label>
            <InputText v-model="form.phone" class="w-full" placeholder="0901 234 567" />
          </div>
        </div>

        <div class="field-grid">
          <div class="field-stack">
            <label>Giờ mở cửa</label>
            <InputText v-model="form.open_time" class="w-full" placeholder="08:00" />
          </div>
          <div class="field-stack">
            <label>Giờ đóng cửa</label>
            <InputText v-model="form.close_time" class="w-full" placeholder="22:00" />
          </div>
        </div>

        <div class="field-grid">
          <div class="field-stack">
            <label>Latitude</label>
            <InputNumber v-model="form.latitude" :minFractionDigits="0" :maxFractionDigits="6" class="w-full" />
          </div>
          <div class="field-stack">
            <label>Longitude</label>
            <InputNumber v-model="form.longitude" :minFractionDigits="0" :maxFractionDigits="6" class="w-full" />
          </div>
        </div>

        <div class="activation-card">
          <div>
            <strong>Trạng thái cửa hàng</strong>
            <p>{{ form.is_active ? 'Cửa hàng đang mở cho vận hành và có thể dùng trong đơn hàng.' : 'Cửa hàng đang ở trạng thái tạm ẩn.' }}</p>
          </div>
          <ToggleSwitch v-model="form.is_active" />
        </div>
      </section>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <button type="button" class="footer-link" @click="close">Hủy thay đổi</button>

        <div class="footer-actions">
          <Button
            :label="isEdit ? 'Lưu cửa hàng' : 'Tạo cửa hàng'"
            class="btn-create-unified"
            :loading="saving"
            @click="handleSubmit"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.store-drawer :deep(.p-dialog-header),
.store-drawer :deep(.p-dialog-footer) {
  padding: 0;
  border: none;
}

.store-drawer :deep(.p-dialog-content) {
  padding: 0;
}

.store-drawer :deep(.p-dialog) {
  border-radius: 0;
}

.drawer-header {
  width: 100%;
  padding: 26px 28px 18px;
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
  margin-top: 10px;
  font-size: clamp(1.7rem, 3vw, 2.3rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  color: #111827;
}

.drawer-body {
  max-height: calc(100vh - 170px);
  overflow-y: auto;
  padding: 24px 28px 10px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 107, 43, 0.08), rgba(255, 214, 10, 0.12));
  border: 1px solid rgba(255, 107, 43, 0.14);
}

.preview-overline {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c2410c;
}

.preview-card h4 {
  margin-top: 8px;
  font-size: 1.3rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: #111827;
}

.preview-card p {
  margin-top: 8px;
  color: #64748b;
  line-height: 1.7;
}

.preview-badges {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 150px;
}

.preview-chip {
  min-height: 40px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  color: #334155;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.preview-chip.active {
  background: rgba(220, 252, 231, 0.92);
  color: #15803d;
}

.field-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field-stack :deep(.p-inputtext),
.field-stack :deep(.p-inputnumber-input) {
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
  font-size: 1rem;
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
  padding: 18px 28px 24px;
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

@media (max-width: 640px) {
  .preview-card,
  .drawer-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
