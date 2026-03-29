<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { inventoryService, type InventoryFilter } from '@/services/inventory.service'
import { useAppToast } from '@/composables/useToast'
import { useRouter } from 'vue-router'
import AdjustModal from '@/components/inventory/AdjustModal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'

const router = useRouter()
const toast = useAppToast()
const loading = ref(true)
const items = ref<any[]>([])
const totalRecords = ref(0)
const showAdjust = ref(false)

const filter = ref<InventoryFilter>({
  page: 1, limit: 20, search: '', sort_order: 'asc',
})
const lowStockOnly = ref(false)

const fetchInventory = async () => {
  loading.value = true
  try {
    const params = { ...filter.value, low_stock: lowStockOnly.value ? 'true' : undefined }
    const { data } = await inventoryService.getAll(params)
    const result = data.data
    items.value = result.data || result.items || result || []
    totalRecords.value = result.total || items.value.length
  } catch {
    toast.error('Không thể tải tồn kho')
  } finally {
    loading.value = false
  }
}

const onPage = (e: any) => {
  filter.value.page = e.page + 1
  filter.value.limit = e.rows
  fetchInventory()
}

const onAdjusted = () => {
  showAdjust.value = false
  fetchInventory()
}

onMounted(fetchInventory)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <InputText v-model="filter.search" placeholder="Tìm sản phẩm..." class="w-64" @keyup.enter="fetchInventory" />
        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="lowStockOnly" @update:modelValue="fetchInventory" />
          <span class="text-xs font-semibold" style="color: var(--text-muted)">Sắp hết hàng</span>
        </div>
      </div>
      <div class="flex gap-2">
        <Button label="Lịch sử kho" icon="pi pi-history" severity="secondary" outlined @click="router.push('/inventory/logs')" />
        <Button label="Điều chỉnh kho" icon="pi pi-sliders-h" class="btn-gradient" @click="showAdjust = true" />
      </div>
    </div>

    <div class="app-card">
      <DataTable :value="items" :loading="loading" :paginator="true" :rows="filter.limit" :totalRecords="totalRecords" :lazy="true" @page="onPage" class="text-sm" stripedRows>
        <template #empty><EmptyState icon="pi pi-warehouse" title="Chưa có tồn kho" /></template>

        <Column header="Sản phẩm" style="min-width: 250px">
          <template #body="{ data }">
            <div>
              <p class="font-semibold text-sm">{{ data.product_name || data.productName || '—' }}</p>
              <p class="text-xs" style="color: var(--text-muted)">{{ data.variant_info || data.sku_code || '' }}</p>
            </div>
          </template>
        </Column>
        <Column header="SKU" style="width: 120px">
          <template #body="{ data }">{{ data.sku_code || '—' }}</template>
        </Column>
        <Column header="Tồn kho" style="width: 100px; text-align: center">
          <template #body="{ data }">
            <span class="font-bold" :class="(data.stock || 0) <= 5 ? 'text-red-500' : 'text-green-600'">
              {{ data.stock || 0 }}
            </span>
          </template>
        </Column>
        <Column header="Danh mục" style="width: 140px">
          <template #body="{ data }">{{ data.category_name || '—' }}</template>
        </Column>
      </DataTable>
    </div>

    <AdjustModal v-model:visible="showAdjust" @adjusted="onAdjusted" />
  </div>
</template>
