<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productService, type Product } from '@/services/product.service'
import { useAppToast } from '@/composables/useToast'
import { formatVND, formatDate } from '@/utils/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ToggleSwitch from 'primevue/toggleswitch'

const route = useRoute()
const router = useRouter()
const toast = useAppToast()

const loading = ref(true)
const product = ref<Product | null>(null)

const showDeleteImageConfirm = ref(false)
const deleteImageTarget = ref<{ id: string } | null>(null)

const fetchProduct = async () => {
  loading.value = true
  try {
    const { data } = await productService.getById(route.params.id as string)
    product.value = data.data
  } catch {
    toast.error('Không thể tải sản phẩm')
    router.push('/products')
  } finally {
    loading.value = false
  }
}

const toggleVariant = async (variant: any) => {
  if (!product.value) return
  try {
    await productService.toggleVariant(product.value.id, variant.id)
    variant.is_active = !variant.is_active
    toast.success(variant.is_active ? 'Đã kích hoạt' : 'Đã tắt')
  } catch {
    toast.error('Cập nhật thất bại')
  }
}

const deleteImage = (img: any) => {
  deleteImageTarget.value = img
  showDeleteImageConfirm.value = true
}

const handleDeleteImage = async () => {
  if (!product.value || !deleteImageTarget.value) return
  try {
    await productService.deleteImage(product.value.id, deleteImageTarget.value.id)
    product.value.images = product.value.images.filter(i => i.id !== deleteImageTarget.value!.id)
    toast.success('Đã xóa ảnh')
  } catch {
    toast.error('Xóa thất bại')
  }
}

onMounted(fetchProduct)
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
  </div>

  <div v-else-if="product" class="max-w-5xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <Button icon="pi pi-arrow-left" text rounded @click="router.push('/products')" />
        <h2 class="text-lg font-bold" style="color: var(--text-primary)">{{ product.name }}</h2>
        <StatusBadge :status="product.is_active ? 'active' : 'inactive'" />
      </div>
      <Button label="Chỉnh sửa" icon="pi pi-pencil" class="btn-gradient" @click="router.push(`/products/${product.id}/edit`)" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- Images -->
      <div class="app-card p-5 fade-in-up">
        <h3 class="text-sm font-bold mb-3">Hình ảnh</h3>
        <div class="flex flex-wrap gap-2">
          <div v-for="img in product.images" :key="img.id" class="relative group">
            <img :src="img.image_url" class="w-20 h-20 rounded-lg object-cover border" />
            <button
              class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              @click="deleteImage(img)"
            >✕</button>
          </div>
          <div v-if="!product.images?.length" class="text-xs" style="color: var(--text-muted)">Chưa có ảnh</div>
        </div>
      </div>

      <!-- Info -->
      <div class="app-card p-5 lg:col-span-2 fade-in-up">
        <h3 class="text-sm font-bold mb-3">Thông tin</h3>
        <div class="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div><span class="text-xs" style="color: var(--text-muted)">Giá bán</span><p class="font-semibold" style="color: var(--primary)">{{ formatVND(product.base_price) }}</p></div>
          <div><span class="text-xs" style="color: var(--text-muted)">Danh mục</span><p class="font-semibold">{{ product.category?.name || '—' }}</p></div>
          <div><span class="text-xs" style="color: var(--text-muted)">Chất liệu</span><p>{{ product.material || '—' }}</p></div>
          <div><span class="text-xs" style="color: var(--text-muted)">Ngày tạo</span><p>{{ formatDate(product.created_at) }}</p></div>
          <div class="col-span-2"><span class="text-xs" style="color: var(--text-muted)">Mô tả</span><p>{{ product.description || '—' }}</p></div>
        </div>
      </div>
    </div>

    <!-- Variants -->
    <div v-if="product.has_variant" class="app-card p-5 mt-5 fade-in-up">
      <h3 class="text-sm font-bold mb-3">Biến thể ({{ product.variants?.length || 0 }})</h3>
      <DataTable :value="product.variants || []" class="text-sm" stripedRows>
        <Column header="SKU" field="sku_code" style="width: 120px">
          <template #body="{ data }">{{ data.sku_code || '—' }}</template>
        </Column>
        <Column header="Thuộc tính">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-1">
              <span v-for="av in data.attribute_values" :key="av.id" class="text-xs px-2 py-0.5 rounded-full" style="background: #F3F4F6">
                {{ av.attribute?.name }}: {{ av.value }}
              </span>
            </div>
          </template>
        </Column>
        <Column header="Giá" style="width: 120px">
          <template #body="{ data }">{{ data.price ? formatVND(data.price) : '—' }}</template>
        </Column>
        <Column header="Tồn kho" field="stock" style="width: 90px; text-align: center" />
        <Column header="Trạng thái" style="width: 100px">
          <template #body="{ data }">
            <ToggleSwitch :modelValue="data.is_active" @update:modelValue="toggleVariant(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <ConfirmDialog v-model:visible="showDeleteImageConfirm" message="Xóa ảnh này?" severity="danger" confirmLabel="Xóa" @confirm="handleDeleteImage" />
  </div>
</template>
