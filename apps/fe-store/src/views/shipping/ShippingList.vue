<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { shippingService, type ShippingMethod } from '@/services/shipping.service'
import { useAppToast } from '@/composables/useToast'
import { formatVND } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ShippingFormModal from '@/components/shipping/ShippingFormModal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'

const toast = useAppToast()
const loading = ref(true)
const methods = ref<ShippingMethod[]>([])

const showForm = ref(false)
const editItem = ref<ShippingMethod | null>(null)
const showDeleteConfirm = ref(false)
const deleteTarget = ref<ShippingMethod | null>(null)

const fetchAll = async () => {
  loading.value = true
  try {
    const { data } = await shippingService.getAll()
    methods.value = data.data || []
  } catch { toast.error('Không thể tải vận chuyển') }
  finally { loading.value = false }
}

const openCreate = () => { editItem.value = null; showForm.value = true }
const openEdit = (m: ShippingMethod) => { editItem.value = { ...m }; showForm.value = true }

const toggleActive = async (m: ShippingMethod) => {
  try {
    await shippingService.toggleActive(m.id, !m.is_active)
    m.is_active = !m.is_active
    toast.success(m.is_active ? 'Đã kích hoạt' : 'Đã tắt')
  } catch { toast.error('Cập nhật thất bại') }
}

const confirmDelete = (m: ShippingMethod) => { deleteTarget.value = m; showDeleteConfirm.value = true }

const handleDelete = async () => {
  if (!deleteTarget.value) return
  try { await shippingService.delete(deleteTarget.value.id); toast.success('Đã xóa'); fetchAll() }
  catch { toast.error('Xóa thất bại') }
}

onMounted(fetchAll)
</script>

<template>
  <div>
    <p class="page-section-label">VẬN CHUYỂN</p>
    <div class="flex items-center justify-between mb-5">
      <h3 class="text-base font-bold" style="color: var(--text-primary)">Phương thức vận chuyển</h3>
      <Button label="Thêm mới" icon="pi pi-plus" class="btn-primary" @click="openCreate" />
    </div>

    <div class="app-card">
      <DataTable :value="methods" :loading="loading" class="text-sm" stripedRows>
        <template #empty><EmptyState icon="pi pi-truck" title="Chưa có phương thức" /></template>
        <Column header="Tên" field="name" style="min-width: 180px" />
        <Column header="Phí" style="width: 130px">
          <template #body="{ data }"><span class="font-semibold">{{ formatVND(data.fee) }}</span></template>
        </Column>
        <Column header="Thời gian" class="hide-mobile" style="width: 110px">
          <template #body="{ data }">{{ data.estimated_days ? `${data.estimated_days} ngày` : '—' }}</template>
        </Column>
        <Column header="TT" style="width: 70px">
          <template #body="{ data }"><ToggleSwitch :modelValue="data.is_active" @update:modelValue="toggleActive(data)" /></template>
        </Column>
        <Column header="" style="width: 80px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button icon="pi pi-pencil" text rounded size="small" severity="secondary" @click="openEdit(data)" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDelete(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <ShippingFormModal v-model:visible="showForm" :shipping="editItem" @saved="showForm = false; fetchAll()" />
    <ConfirmDialog v-model:visible="showDeleteConfirm" message="Xóa phương thức vận chuyển này?" severity="danger" confirmLabel="Xóa" @confirm="handleDelete" />
  </div>
</template>
