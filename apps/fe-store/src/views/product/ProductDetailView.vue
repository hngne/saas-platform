<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productService, type Product, type ProductVariant } from '@/services/product.service'
import { useAppToast } from '@/composables/useToast'
import { formatDate, formatVND } from '@/utils/format'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'

const route = useRoute()
const router = useRouter()
const toast = useAppToast()

const loading = ref(true)
const product = ref<Product | null>(null)
const selectedImage = ref('')

const galleryImages = computed(() => product.value?.images || [])
const totalStock = computed(() =>
  (product.value?.variants || []).reduce((sum, variant) => sum + (variant.stock || 0), 0),
)
const variantCount = computed(() => product.value?.variants?.length || 0)
const activeVariantCount = computed(() =>
  (product.value?.variants || []).filter((variant) => variant.is_active).length,
)
const inventoryTone = computed(() => {
  if (totalStock.value <= 0) return 'danger'
  if (totalStock.value <= 5) return 'warning'
  return 'healthy'
})

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

const toggleVariant = async (variant: ProductVariant, nextValue: boolean) => {
  if (!product.value) return

  try {
    await productService.toggleVariant(product.value.id, variant.id, nextValue)
    variant.is_active = nextValue
    toast.success(nextValue ? 'Đã kích hoạt' : 'Đã tắt')
  } catch {
    toast.error('Cập nhật thất bại')
  }
}

watch(
  galleryImages,
  (images) => {
    if (!images.length) {
      selectedImage.value = ''
      return
    }

    if (!selectedImage.value || !images.some((image) => image.image_url === selectedImage.value)) {
      selectedImage.value = images[0]?.image_url || ''
    }
  },
  { immediate: true },
)

onMounted(fetchProduct)
</script>

<template>
  <div v-if="loading" class="loading-wrap">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
  </div>

  <div v-else-if="product" class="detail-page">
    <div class="breadcrumb">
      <router-link to="/products" class="breadcrumb-link">Sản phẩm</router-link>
      <i class="pi pi-chevron-right breadcrumb-sep"></i>
      <span class="breadcrumb-current">{{ product.name }}</span>
    </div>

    <section class="hero-card app-card">
      <div class="hero-copy">
        <p class="section-kicker">Chi tiết sản phẩm</p>
        <h1 class="detail-title">{{ product.name }}</h1>
        <p class="hero-subtitle">
          {{ product.description || 'Xem nhanh bộ ảnh, thông tin bán hàng và cấu hình biến thể của sản phẩm.' }}
        </p>

        <div class="detail-badges">
          <span class="status-badge" :class="product.is_active ? 'badge-active' : 'badge-inactive'">
            {{ product.is_active ? 'Đang hoạt động' : 'Ngừng bán' }}
          </span>
          <span class="status-badge badge-variant">
            {{ product.has_variant ? `${variantCount} biến thể` : 'Sản phẩm đơn' }}
          </span>
          <span class="status-badge badge-category">
            {{ product.category?.name || 'Chưa phân loại' }}
          </span>
        </div>
      </div>

      <div class="hero-side">
        <div class="hero-price">{{ formatVND(product.base_price) }}</div>
        <div class="hero-meta">Slug: {{ product.slug || '—' }}</div>
        <Button
          label="Chỉnh sửa"
          icon="pi pi-pencil"
          class="btn-gradient hero-action"
          @click="router.push(`/products/${product.id}/edit`)"
        />
      </div>
    </section>

    <section class="overview-grid">
      <div class="gallery-card app-card">
        <div class="card-head">
          <div>
            <p class="card-kicker">Bộ ảnh</p>
            <h2 class="card-title">Hình ảnh sản phẩm</h2>
          </div>
          <span class="card-count">{{ galleryImages.length }} ảnh</span>
        </div>

        <div class="gallery-stage">
          <img v-if="selectedImage" :src="selectedImage" class="gallery-main-image" />
          <div v-else class="gallery-empty">
            <i class="pi pi-image gallery-empty-icon"></i>
            <p>Chưa có ảnh sản phẩm</p>
          </div>
        </div>

        <div v-if="galleryImages.length" class="gallery-thumbs">
          <button
            v-for="(image, index) in galleryImages"
            :key="image.id"
            type="button"
            class="thumb-button"
            :class="{ active: selectedImage === image.image_url }"
            @click="selectedImage = image.image_url"
          >
            <img :src="image.image_url" class="thumb-image" />
            <span v-if="index === 0" class="thumb-badge">Ảnh chính</span>
          </button>
        </div>
      </div>

      <div class="summary-stack">
        <div class="summary-card app-card">
          <div class="card-head">
            <div>
              <p class="card-kicker">Thông tin</p>
              <h2 class="card-title">Tổng quan bán hàng</h2>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-metric">
              <span class="metric-label">Giá bán</span>
              <strong class="metric-value metric-price">{{ formatVND(product.base_price) }}</strong>
            </div>
            <div class="summary-metric">
              <span class="metric-label">Tồn kho</span>
              <strong class="metric-value" :class="`metric-${inventoryTone}`">{{ totalStock }}</strong>
            </div>
            <div class="summary-metric">
              <span class="metric-label">Biến thể hoạt động</span>
              <strong class="metric-value">{{ activeVariantCount }}</strong>
            </div>
            <div class="summary-metric">
              <span class="metric-label">Chất liệu</span>
              <strong class="metric-value metric-text">{{ product.material || 'Chưa cập nhật' }}</strong>
            </div>
          </div>

          <div class="meta-list">
            <div class="meta-row">
              <span class="meta-label">Danh mục</span>
              <span class="meta-value">{{ product.category?.name || 'Chưa phân loại' }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Ngày tạo</span>
              <span class="meta-value">{{ formatDate(product.created_at) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Cập nhật</span>
              <span class="meta-value">{{ formatDate(product.updated_at) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Slug</span>
              <span class="meta-value meta-code">{{ product.slug || '—' }}</span>
            </div>
          </div>
        </div>

        <div class="summary-card app-card">
          <div class="card-head">
            <div>
              <p class="card-kicker">Mô tả</p>
              <h2 class="card-title">Nội dung hiển thị</h2>
            </div>
          </div>
          <p class="description-text">
            {{ product.description || 'Sản phẩm này chưa có mô tả chi tiết.' }}
          </p>
        </div>
      </div>
    </section>

    <section v-if="product.has_variant && product.variants?.length" class="variant-card app-card">
      <div class="card-head variant-card-head">
        <div>
          <p class="card-kicker">Biến thể</p>
          <h2 class="card-title">Quản lý SKU hiện có</h2>
        </div>
        <span class="card-count">{{ variantCount }} dòng SKU</span>
      </div>

      <div class="variant-table-wrap">
        <table class="variant-table">
          <thead>
            <tr>
              <th>Sản phẩm / SKU</th>
              <th>Thuộc tính</th>
              <th>Giá bán</th>
              <th class="text-center">Tồn kho</th>
              <th class="text-center">Kích hoạt</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="variant in product.variants" :key="variant.id">
              <td>
                <div class="variant-identity">
                  <span class="variant-sku">{{ variant.sku_code || 'Tự sinh SKU' }}</span>
                  <span class="variant-subtitle">{{ product.name }}</span>
                </div>
              </td>
              <td>
                <div class="attr-chips">
                  <span
                    v-for="attributeValue in variant.attribute_values"
                    :key="attributeValue.id"
                    class="attr-chip"
                  >
                    {{ attributeValue.attribute?.name }}: {{ attributeValue.value }}
                  </span>
                  <span v-if="!variant.attribute_values?.length" class="text-muted">Chưa chọn thuộc tính</span>
                </div>
              </td>
              <td>
                <span class="table-price">{{ formatVND(variant.price ?? product.base_price) }}</span>
              </td>
              <td class="text-center">
                <span class="stock-pill" :class="variant.stock <= 5 ? 'stock-low' : 'stock-ok'">
                  {{ variant.stock }}
                </span>
              </td>
              <td class="text-center">
                <ToggleSwitch
                  :modelValue="variant.is_active"
                  @update:modelValue="toggleVariant(variant, $event)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 420px;
}

.detail-page {
  max-width: 1280px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.78rem;
}

.breadcrumb-link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-sep {
  font-size: 0.6rem;
  color: #cbd5e1;
}

.breadcrumb-current {
  color: #94a3b8;
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) 280px;
  gap: 24px;
  padding: 28px 32px;
  margin-bottom: 22px;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.18), transparent 30%),
    linear-gradient(135deg, rgba(255, 107, 43, 0.05), rgba(255, 255, 255, 0.92));
}

.section-kicker,
.card-kicker {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #94a3b8;
}

.detail-title {
  margin-top: 8px;
  font-size: clamp(2rem, 3vw, 2.6rem);
  line-height: 1.06;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.hero-subtitle {
  max-width: 760px;
  margin-top: 12px;
  font-size: 0.95rem;
  line-height: 1.8;
  color: #64748b;
}

.detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
}

.badge-active {
  background: #ecfdf5;
  color: #059669;
}

.badge-inactive {
  background: #f3f4f6;
  color: #6b7280;
}

.badge-variant {
  background: #eff6ff;
  color: #2563eb;
}

.badge-category {
  background: #fff7ed;
  color: #ea580c;
}

.hero-side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 107, 43, 0.14);
}

.hero-price {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
  color: var(--primary);
}

.hero-meta {
  font-size: 0.78rem;
  color: #64748b;
  word-break: break-word;
}

.hero-action {
  width: 100%;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.gallery-card,
.summary-card,
.variant-card {
  padding: 24px;
}

.summary-stack {
  display: grid;
  gap: 18px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.card-title {
  margin-top: 6px;
  font-size: 1.28rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.card-count {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: #fff7ed;
  color: #ea580c;
  font-size: 0.74rem;
  font-weight: 700;
}

.gallery-stage {
  position: relative;
  min-height: 440px;
  border-radius: 24px;
  overflow: hidden;
  background:
    linear-gradient(140deg, rgba(255, 107, 43, 0.12), rgba(255, 255, 255, 0.88)),
    #f8fafc;
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.gallery-main-image {
  width: 100%;
  height: 100%;
  min-height: 440px;
  object-fit: cover;
  display: block;
}

.gallery-empty {
  min-height: 440px;
  display: grid;
  place-items: center;
  gap: 10px;
  color: #94a3b8;
  text-align: center;
  font-weight: 600;
}

.gallery-empty-icon {
  font-size: 3.6rem;
  color: #cbd5e1;
}

.gallery-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.thumb-button {
  position: relative;
  width: 82px;
  height: 82px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.thumb-button:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 107, 43, 0.45);
}

.thumb-button.active {
  border-color: var(--primary);
  box-shadow: 0 10px 24px rgba(255, 107, 43, 0.16);
}

.thumb-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-badge {
  position: absolute;
  left: 8px;
  bottom: 8px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.82);
  color: #fff;
  font-size: 0.58rem;
  font-weight: 700;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.summary-metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  border: 1px solid #edf2f7;
}

.metric-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.metric-value {
  font-size: 1.36rem;
  font-weight: 800;
  line-height: 1.15;
  color: var(--text-primary);
}

.metric-price {
  color: var(--primary);
}

.metric-healthy {
  color: #059669;
}

.metric-warning {
  color: #d97706;
}

.metric-danger {
  color: #dc2626;
}

.metric-text {
  font-size: 1rem;
}

.meta-list {
  display: grid;
  gap: 12px;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.meta-label {
  font-size: 0.76rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.meta-value {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
}

.meta-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #475569;
}

.description-text {
  font-size: 0.96rem;
  line-height: 1.85;
  color: #475569;
}

.variant-card {
  margin-top: 22px;
  margin-bottom: 24px;
}

.variant-card-head {
  margin-bottom: 14px;
}

.variant-table-wrap {
  overflow-x: auto;
}

.variant-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.variant-table thead th {
  padding: 14px 12px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.variant-table tbody td {
  padding: 18px 12px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.variant-identity {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.variant-sku {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
}

.variant-subtitle {
  font-size: 0.78rem;
  color: #94a3b8;
}

.attr-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attr-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.74rem;
  font-weight: 600;
  border: 1px solid #e2e8f0;
}

.table-price {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--primary);
}

.stock-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding: 6px 10px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.78rem;
}

.stock-ok {
  background: #ecfdf5;
  color: #059669;
}

.stock-low {
  background: #fff7ed;
  color: #d97706;
}

.text-center {
  text-align: center;
}

.text-muted {
  color: #94a3b8;
  font-size: 0.8rem;
}

@media (max-width: 1100px) {
  .hero-card,
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .hero-side {
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .hero-card,
  .gallery-card,
  .summary-card,
  .variant-card {
    padding: 18px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .gallery-stage,
  .gallery-main-image,
  .gallery-empty {
    min-height: 300px;
  }

  .meta-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .meta-value {
    text-align: left;
  }
}

@media (max-width: 640px) {
  .gallery-stage,
  .gallery-main-image,
  .gallery-empty {
    min-height: 240px;
  }

  .variant-table thead {
    display: none;
  }

  .variant-table tbody td {
    display: block;
    width: 100%;
    padding: 10px 0;
    border-bottom: none;
  }

  .variant-table tbody tr {
    display: block;
    padding: 14px 0;
    border-bottom: 1px solid #f1f5f9;
  }
}
</style>
