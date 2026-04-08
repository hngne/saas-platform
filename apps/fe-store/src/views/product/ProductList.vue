<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { productService, type Product, type ProductFilter } from '@/services/product.service'
import { categoryService, type Category } from '@/services/category.service'
import { useAppToast } from '@/composables/useToast'
import { formatVND } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'

const router = useRouter()
const toast = useAppToast()
const loading = ref(true)
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const totalRecords = ref(0)

const filter = ref<ProductFilter>({
  page: 1,
  limit: 20,
  search: '',
  sort_by: 'created_at',
  sort_order: 'desc',
})

// Delete
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Product | null>(null)

const fetchProducts = async () => {
  loading.value = true
  try {
    const { data } = await productService.getAll(filter.value)
    const result = data.data
    products.value = result.data || result.items || result || []
    totalRecords.value = result.total || result.totalItems || products.value.length
  } catch {
    toast.error('Không thể tải sản phẩm')
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const { data } = await categoryService.getAll()
    categories.value = (data.data || []).map((c: Category) => ({ label: c.name, value: c.id, ...c }))
  } catch { /* ignore */ }
}

const onPage = (e: any) => {
  filter.value.page = e.page + 1
  filter.value.limit = e.rows
  fetchProducts()
}

const toggleActive = async (prod: Product) => {
  try {
    await productService.toggleActive(prod.id)
    prod.is_active = !prod.is_active
    toast.success(prod.is_active ? 'Đã kích hoạt' : 'Đã tắt')
  } catch {
    toast.error('Cập nhật thất bại')
  }
}

const confirmDelete = (prod: Product) => {
  deleteTarget.value = prod
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return
  try {
    await productService.delete(deleteTarget.value.id)
    toast.success('Đã xóa sản phẩm')
    fetchProducts()
  } catch {
    toast.error('Xóa thất bại')
  }
}

const getStock = (prod: Product) => {
  if (!prod.has_variant || !prod.variants?.length) return 0
  return prod.variants.reduce((s, v) => s + (v.stock || 0), 0)
}

onMounted(() => {
  fetchProducts()
  fetchCategories()
})
</script>

<template>
  <div>
    <p class="page-section-label">QUẢN LÝ SẢN PHẨM</p>

    <!-- Filter bar -->
    <div class="filter-bar mb-5">
      <InputText
        v-model="filter.search"
        placeholder="Tìm sản phẩm..."
        class="filter-search"
        @keyup.enter="fetchProducts"
      />
      <Select
        v-model="filter.category_id"
        :options="categories"
        optionLabel="label"
        optionValue="value"
        placeholder="Danh mục"
        showClear
        class="filter-cat hide-mobile"
        @change="fetchProducts"
      />
      <Select
        v-model="filter.is_active"
        :options="[{ label: 'Hoạt động', value: 'true' }, { label: 'Ngừng', value: 'false' }]"
        optionLabel="label"
        optionValue="value"
        placeholder="Trạng thái"
        showClear
        class="filter-status hide-mobile"
        @change="fetchProducts"
      />
      <div class="ml-auto">
        <Button label="Thêm sản phẩm" icon="pi pi-plus" class="btn-primary" @click="router.push('/products/new')" />
      </div>
    </div>

    <!-- Table -->
    <div class="app-card">
      <DataTable
        :value="products"
        :loading="loading"
        :paginator="true"
        :rows="filter.limit"
        :totalRecords="totalRecords"
        :lazy="true"
        @page="onPage"
        :rowsPerPageOptions="[10, 20, 50]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        class="text-sm"
        stripedRows
      >
        <template #empty>
          <EmptyState icon="pi pi-box" title="Chưa có sản phẩm" />
        </template>

        <Column header="Sản phẩm" style="min-width: 240px">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <img
                v-if="data.images?.[0]?.image_url"
                :src="data.images[0].image_url"
                class="w-10 h-10 rounded-lg object-cover"
              />
              <div v-else class="w-10 h-10 rounded-lg flex items-center justify-center" style="background: #f1f5f9">
                <i class="pi pi-image" style="color: #cbd5e1"></i>
              </div>
              <div>
                <p class="font-semibold text-sm" style="color: var(--text-primary)">{{ data.name }}</p>
                <p class="text-xs" style="color: var(--text-muted)">{{ data.category?.name || '—' }}</p>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Giá" style="width: 120px">
          <template #body="{ data }">
            <span class="font-semibold" style="color: var(--primary)">{{ formatVND(data.base_price) }}</span>
          </template>
        </Column>

        <Column header="Tồn kho" style="width: 80px; text-align: center">
          <template #body="{ data }">
            <span :class="getStock(data) <= 5 ? 'text-red-500 font-bold' : ''">
              {{ getStock(data) }}
            </span>
          </template>
        </Column>

        <Column header="Biến thể" class="hide-mobile" style="width: 80px; text-align: center">
          <template #body="{ data }">
            <span v-if="data.has_variant" class="text-xs px-2 py-0.5 rounded-full" style="background: #EFF6FF; color: #3B82F6">
              {{ data.variants?.length || 0 }}
            </span>
            <span v-else class="text-xs" style="color: var(--text-muted)">—</span>
          </template>
        </Column>

        <Column header="TT" style="width: 70px">
          <template #body="{ data }">
            <ToggleSwitch :modelValue="data.is_active" @update:modelValue="toggleActive(data)" />
          </template>
        </Column>

        <Column header="" style="width: 90px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button icon="pi pi-eye" text rounded size="small" @click="router.push(`/products/${data.id}`)" />
              <Button icon="pi pi-pencil" text rounded size="small" severity="secondary" @click="router.push(`/products/${data.id}/edit`)" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDelete(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      message="Bạn có chắc muốn xóa sản phẩm này?"
      severity="danger"
      confirmLabel="Xóa"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.filter-search { width: 220px; }
.filter-cat { width: 160px; }
.filter-status { width: 130px; }
@media (max-width: 768px) {
  .filter-search { width: 100% !important; }
}
</style>
