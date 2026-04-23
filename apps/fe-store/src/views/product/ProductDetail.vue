<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productService, type Product } from '@/services/product.service'
import { useAppToast } from '@/composables/useToast'
import { formatVND, formatDate } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'

const route = useRoute()
const router = useRouter()
const toast = useAppToast()

const loading = ref(true)
const product = ref<Product | null>(null)
const selectedImage = ref('')

const showDeleteImageConfirm = ref(false)
const deleteImageTarget = ref<{ id: string } | null>(null)

const fetchProduct = async () => {
  loading.value = true
  try {
    const { data } = await productService.getById(route.params.id as string)
    product.value = data.data
    if (product.value?.images?.[0]) {
      selectedImage.value = product.value.images[0].image_url
    }
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
    const nextValue = !variant.is_active
    await productService.toggleVariant(product.value.id, variant.id, nextValue)
    variant.is_active = nextValue
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

const getStock = () => {
  if (!product.value?.variants?.length) return 0
  return product.value.variants.reduce((s, v) => s + (v.stock || 0), 0)
}

onMounted(fetchProduct)
</script>

<template>
  <div v-if="loading" class="loading-wrap">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
  </div>

  <div v-else-if="product" class="detail-page">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <router-link to="/products" class="breadcrumb-link">Sản phẩm</router-link>
      <i class="pi pi-chevron-right breadcrumb-sep"></i>
      <span class="breadcrumb-current">{{ product.name }}</span>
    </div>

    <!-- Header -->
    <div class="detail-header">
      <div class="header-left">
        <h1 class="detail-title">{{ product.name }}</h1>
        <div class="detail-badges">
          <span class="status-badge" :class="product.is_active ? 'badge-active' : 'badge-inactive'">
            {{ product.is_active ? 'Đang hoạt động' : 'Ngừng bán' }}
          </span>
          <span v-if="product.has_variant" class="status-badge badge-variant">
            {{ product.variants?.length || 0 }} biến thể
          </span>
        </div>
      </div>
      <div class="header-actions">
        <Button label="Chỉnh sửa" icon="pi pi-pencil" class="btn-gradient" @click="router.push(`/products/${product.id}/edit`)" />
      </div>
    </div>

    <div class="detail-grid">
      <!-- Left: Images -->
      <div class="detail-images app-card">
        <div class="main-image-wrap">
          <img v-if="selectedImage" :src="selectedImage" class="main-image" />
          <div v-else class="main-image-empty">
            <i class="pi pi-image" style="font-size: 3rem; color: #E5E7EB"></i>
          </div>
        </div>
        <div class="thumb-list">
          <div
            v-for="img in product.images"
            :key="img.id"
            class="thumb-item"
            :class="{ active: selectedImage === img.image_url }"
            @click="selectedImage = img.image_url"
          >
            <img :src="img.image_url" />
          </div>
        </div>
      </div>

      <!-- Right: Info -->
      <div class="detail-info">
        <div class="app-card info-card">
          <h3 class="info-section-title">Thông tin sản phẩm</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Giá bán</span>
              <span class="info-value price">{{ formatVND(product.base_price) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Danh mục</span>
              <span class="info-value">{{ product.category?.name || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Chất liệu</span>
              <span class="info-value">{{ product.material || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tồn kho</span>
              <span class="info-value" :class="getStock() <= 5 ? 'text-danger' : ''">{{ getStock() }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Ngày tạo</span>
              <span class="info-value">{{ formatDate(product.created_at) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cập nhật</span>
              <span class="info-value">{{ formatDate(product.updated_at) }}</span>
            </div>
          </div>
        </div>

        <div v-if="product.description" class="app-card info-card">
          <h3 class="info-section-title">Mô tả</h3>
          <p class="desc-text">{{ product.description }}</p>
        </div>
      </div>
    </div>

    <!-- Variants -->
    <div v-if="product.has_variant && product.variants?.length" class="app-card variant-card">
      <div class="variant-header">
        <h3 class="info-section-title">Biến thể ({{ product.variants.length }})</h3>
      </div>
      <table class="variant-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>THUỘC TÍNH</th>
            <th>GIÁ</th>
            <th class="text-center">TỒN KHO</th>
            <th class="text-center">TRẠNG THÁI</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in product.variants" :key="v.id">
            <td>
              <span class="sku-text">{{ v.sku_code || '—' }}</span>
            </td>
            <td>
              <div class="attr-chips">
                <span v-for="av in v.attribute_values" :key="av.id" class="attr-chip">
                  {{ av.attribute?.name }}: {{ av.value }}
                </span>
                <span v-if="!v.attribute_values?.length" class="text-muted">—</span>
              </div>
            </td>
            <td>
              <span class="price">{{ formatVND(v.price ?? product.base_price) }}</span>
            </td>
            <td class="text-center">
              <span :class="v.stock <= 5 ? 'text-danger font-bold' : ''">{{ v.stock }}</span>
            </td>
            <td class="text-center">
              <ToggleSwitch :modelValue="v.is_active" @update:modelValue="toggleVariant(v)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog v-model:visible="showDeleteImageConfirm" message="Xóa ảnh này?" severity="danger" confirmLabel="Xóa" @confirm="handleDeleteImage" />
  </div>
</template>

<style scoped>
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}
.detail-page { max-width: 1200px; }

/* Breadcrumb */
.breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 0.78rem; }
.breadcrumb-link { color: var(--primary); text-decoration: none; font-weight: 500; }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { font-size: 0.6rem; color: #CBD5E1; }
.breadcrumb-current { color: #9CA3AF; }

/* Header */
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
}
.detail-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
}
.detail-badges {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
}
.badge-active { background: #ECFDF5; color: #059669; }
.badge-inactive { background: #F3F4F6; color: #6B7280; }
.badge-variant { background: #EFF6FF; color: #2563EB; }

/* Grid */
.detail-grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

/* Images */
.detail-images { padding: 16px; }
.main-image-wrap {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: #F9FAFB;
  margin-bottom: 12px;
}
.main-image { width: 100%; height: 100%; object-fit: cover; }
.main-image-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.thumb-list { display: flex; gap: 8px; flex-wrap: wrap; }
.thumb-item {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}
.thumb-item.active { border-color: var(--primary); }
.thumb-item img { width: 100%; height: 100%; object-fit: cover; }

/* Info */
.info-card { padding: 24px; margin-bottom: 16px; }
.info-section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-label { font-size: 0.68rem; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; }
.info-value { font-size: 0.92rem; font-weight: 600; color: var(--text-primary); }
.info-value.price { color: var(--primary); font-size: 1.1rem; font-weight: 800; }
.desc-text { font-size: 0.88rem; color: #4B5563; line-height: 1.7; }

/* Variant */
.variant-card { padding: 24px; margin-bottom: 24px; }
.variant-table { width: 100%; border-collapse: collapse; }
.variant-table th {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #9CA3AF;
  text-transform: uppercase;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
.variant-table td { padding: 14px 12px; border-bottom: 1px solid #F3F4F6; }
.sku-text { font-family: monospace; font-size: 0.82rem; font-weight: 600; color: var(--text-primary); }
.attr-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.attr-chip {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.68rem;
  background: #F3F4F6;
  color: #374151;
  font-weight: 500;
}
.price { color: var(--primary); font-weight: 700; }
.text-danger { color: #EF4444; }
.text-muted { color: #9CA3AF; font-size: 0.82rem; }
.text-center { text-align: center; }
.font-bold { font-weight: 700; }

@media (max-width: 768px) {
  .detail-grid { grid-template-columns: 1fr; }
  .detail-header { flex-direction: column; }
  .info-grid { grid-template-columns: 1fr; }
}
</style>
