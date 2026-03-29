<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { voucherService, type Voucher, type VoucherFilter } from '@/services/voucher.service'
import { useAppToast } from '@/composables/useToast'
import { formatVND, formatDate } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import VoucherFormModal from '@/components/voucher/VoucherFormModal.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'

const toast = useAppToast()
const loading = ref(true)
const vouchers = ref<Voucher[]>([])
const totalRecords = ref(0)
const filter = ref<VoucherFilter>({ page: 1, limit: 20, search: '' })

const showForm = ref(false)
const editItem = ref<Voucher | null>(null)
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Voucher | null>(null)

const fetchAll = async () => {
  loading.value = true
  try {
    const { data } = await voucherService.getAll(filter.value)
    const result = data.data
    vouchers.value = result.data || result.items || result || []
    totalRecords.value = result.total || vouchers.value.length
  } catch { toast.error('Không thể tải voucher') }
  finally { loading.value = false }
}

const onPage = (e: any) => { filter.value.page = e.page + 1; filter.value.limit = e.rows; fetchAll() }

const openCreate = () => { editItem.value = null; showForm.value = true }
const openEdit = (v: Voucher) => { editItem.value = { ...v }; showForm.value = true }

const toggleActive = async (v: Voucher) => {
  try { await voucherService.toggleActive(v.id, !v.is_active); v.is_active = !v.is_active; toast.success(v.is_active ? 'Đã kích hoạt' : 'Đã tắt') }
  catch { toast.error('Cập nhật thất bại') }
}

const confirmDelete = (v: Voucher) => { deleteTarget.value = v; showDeleteConfirm.value = true }
const handleDelete = async () => {
  if (!deleteTarget.value) return
  try { await voucherService.delete(deleteTarget.value.id); toast.success('Đã xóa'); fetchAll() }
  catch { toast.error('Xóa thất bại') }
}

onMounted(fetchAll)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <InputText v-model="filter.search" placeholder="Tìm mã voucher..." class="w-64" @keyup.enter="fetchAll" />
      <Button label="Thêm voucher" icon="pi pi-plus" class="btn-gradient" @click="openCreate" />
    </div>

    <div class="app-card">
      <DataTable :value="vouchers" :loading="loading" :paginator="true" :rows="filter.limit" :totalRecords="totalRecords" :lazy="true" @page="onPage" class="text-sm" stripedRows>
        <template #empty><EmptyState icon="pi pi-ticket" title="Chưa có voucher" /></template>

        <Column header="Mã" style="width: 130px">
          <template #body="{ data }">
            <span class="font-bold text-xs px-2 py-1 rounded" style="background: #FFF5EE; color: var(--primary)">{{ data.code }}</span>
          </template>
        </Column>
        <Column header="Tên" style="min-width: 150px">
          <template #body="{ data }">{{ data.name || '—' }}</template>
        </Column>
        <Column header="Loại" style="width: 100px">
          <template #body="{ data }"><StatusBadge :status="data.discount_type" /></template>
        </Column>
        <Column header="Giá trị" style="width: 120px">
          <template #body="{ data }">
            <span class="font-semibold">{{ data.discount_type === 'PERCENT' ? data.discount_value + '%' : formatVND(data.discount_value) }}</span>
          </template>
        </Column>
        <Column header="Đã dùng" style="width: 100px; text-align: center">
          <template #body="{ data }">
            <span>{{ data.used_count || 0 }} / {{ data.usage_limit || '∞' }}</span>
          </template>
        </Column>
        <Column header="Hiệu lực" style="width: 180px">
          <template #body="{ data }">
            <span class="text-xs">
              {{ data.start_date ? formatDate(data.start_date) : '—' }} → {{ data.end_date ? formatDate(data.end_date) : '—' }}
            </span>
          </template>
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

    <VoucherFormModal v-model:visible="showForm" :voucher="editItem" @saved="showForm = false; fetchAll()" />
    <ConfirmDialog v-model:visible="showDeleteConfirm" message="Xóa voucher này?" severity="danger" confirmLabel="Xóa" @confirm="handleDelete" />
  </div>
</template>
