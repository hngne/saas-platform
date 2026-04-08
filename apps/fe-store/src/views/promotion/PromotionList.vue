<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { promotionService, type Promotion, type PromotionFilter } from '@/services/promotion.service'
import { useAppToast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'

const router = useRouter()
const toast = useAppToast()
const loading = ref(true)
const promotions = ref<Promotion[]>([])
const totalRecords = ref(0)
const filter = ref<PromotionFilter>({ page: 1, limit: 20, search: '' })

const showDeleteConfirm = ref(false)
const deleteTarget = ref<Promotion | null>(null)

const fetchAll = async () => {
  loading.value = true
  try {
    const { data } = await promotionService.getAll(filter.value)
    const result = data.data
    promotions.value = result.data || result.items || result || []
    totalRecords.value = result.total || promotions.value.length
  } catch { toast.error('Không thể tải khuyến mãi') }
  finally { loading.value = false }
}

const onPage = (e: any) => { filter.value.page = e.page + 1; filter.value.limit = e.rows; fetchAll() }

const toggleActive = async (p: Promotion) => {
  try { await promotionService.toggleActive(p.id, !p.is_active); p.is_active = !p.is_active; toast.success(p.is_active ? 'Đã kích hoạt' : 'Đã tắt') }
  catch { toast.error('Cập nhật thất bại') }
}

const confirmDelete = (p: Promotion) => { deleteTarget.value = p; showDeleteConfirm.value = true }
const handleDelete = async () => {
  if (!deleteTarget.value) return
  try { await promotionService.delete(deleteTarget.value.id); toast.success('Đã xóa'); fetchAll() }
  catch { toast.error('Xóa thất bại') }
}

onMounted(fetchAll)
</script>

<template>
  <div>
    <p class="page-section-label">KHUYẾN MÃI</p>
    <div class="filter-bar mb-5">
      <InputText v-model="filter.search" placeholder="Tìm khuyến mãi..." style="width: 220px" @keyup.enter="fetchAll" />
      <div class="ml-auto">
        <Button label="Tạo khuyến mãi" icon="pi pi-plus" class="btn-primary" @click="router.push('/promotions/new')" />
      </div>
    </div>

    <div class="app-card">
      <DataTable :value="promotions" :loading="loading" :paginator="true" :rows="filter.limit" :totalRecords="totalRecords" :lazy="true" @page="onPage" class="text-sm" stripedRows>
        <template #empty><EmptyState icon="pi pi-megaphone" title="Chưa có khuyến mãi" /></template>

        <Column header="Tên" field="name" style="min-width: 200px">
          <template #body="{ data }"><span class="font-semibold">{{ data.name }}</span></template>
        </Column>
        <Column header="Thời gian" class="hide-mobile" style="width: 200px">
          <template #body="{ data }">
            <span class="text-xs">{{ data.start_date ? formatDate(data.start_date) : '—' }} → {{ data.end_date ? formatDate(data.end_date) : '—' }}</span>
          </template>
        </Column>
        <Column header="SP áp dụng" style="width: 100px; text-align: center">
          <template #body="{ data }">
            <span class="text-xs px-2 py-0.5 rounded-full" style="background: #EFF6FF; color: #3B82F6">{{ data.details?.length || 0 }}</span>
          </template>
        </Column>
        <Column header="TT" style="width: 70px">
          <template #body="{ data }"><ToggleSwitch :modelValue="data.is_active" @update:modelValue="toggleActive(data)" /></template>
        </Column>
        <Column header="" style="width: 100px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button icon="pi pi-pencil" text rounded size="small" severity="secondary" @click="router.push(`/promotions/${data.id}/edit`)" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDelete(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <ConfirmDialog v-model:visible="showDeleteConfirm" message="Xóa khuyến mãi này?" severity="danger" confirmLabel="Xóa" @confirm="handleDelete" />
  </div>
</template>
