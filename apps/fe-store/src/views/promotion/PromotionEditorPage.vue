<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { promotionService, type CreatePromotionDto, type PromotionDetail } from '@/services/promotion.service'
import { productService, type Product } from '@/services/product.service'
import { useAppToast } from '@/composables/useToast'
import { formatNumber, formatVND } from '@/utils/format'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'

interface EditablePromotionDetail {
  product_id: string
  discount_percent: number
  product_name: string
  product_image: string | null
  product_price: number
  product_code: string
  category_name: string | null
}

const route = useRoute()
const router = useRouter()
const toast = useAppToast()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const saving = ref(false)
const allProducts = ref<Product[]>([])

const showProductModal = ref(false)
const modalSearch = ref('')
const modalCategory = ref<string | null>(null)
const modalSelectedProducts = ref<Product[]>([])

const originalDetails = ref<EditablePromotionDetail[]>([])

const form = ref({
  name: '',
  description: '',
  start_date: null as Date | null,
  end_date: null as Date | null,
  is_active: true,
})

const details = ref<EditablePromotionDetail[]>([])

const buildProductCode = (product: { id: string; slug?: string | null }) => {
  if (product.slug) return product.slug.replace(/-/g, ' ').toUpperCase().slice(0, 18)
  return `SP-${product.id.slice(0, 8).toUpperCase()}`
}

const mapProductToDetail = (product: Product, discountPercent = 15): EditablePromotionDetail => ({
  product_id: product.id,
  discount_percent: discountPercent,
  product_name: product.name,
  product_image: product.images?.[0]?.image_url || null,
  product_price: Number(product.base_price || 0),
  product_code: buildProductCode(product),
  category_name: product.category?.name || null,
})

const mapPromotionDetail = (detail: PromotionDetail): EditablePromotionDetail => ({
  product_id: detail.product_id,
  discount_percent: Number(detail.discount_percent || 0),
  product_name: detail.product?.name || detail.product_name || 'Sản phẩm',
  product_image: detail.product?.image_url || null,
  product_price: Number(detail.product?.base_price || 0),
  product_code: buildProductCode({ id: detail.product_id }),
  category_name: null,
})

const selectedProductIds = computed(() => new Set(details.value.map((detail) => detail.product_id)))

const productCategories = computed(() => {
  const cats = new Map()
  for (const p of allProducts.value) {
    if (p.category?.id && !cats.has(p.category.id)) {
      cats.set(p.category.id, p.category)
    }
  }
  return Array.from(cats.values())
})

const modalFilteredProducts = computed(() => {
  const keyword = modalSearch.value.trim().toLowerCase()
  const categoryId = modalCategory.value
  
  return allProducts.value.filter((product) => {
    // Hide already selected products
    if (selectedProductIds.value.has(product.id)) return false
    
    // Filter by category
    if (categoryId && product.category?.id !== categoryId) return false
    
    // Filter by keyword
    if (keyword) {
      return product.name.toLowerCase().includes(keyword)
        || (product.category?.name || '').toLowerCase().includes(keyword)
        || (product.slug || '').toLowerCase().includes(keyword)
    }
    
    return true
  })
})

const selectedCount = computed(() => details.value.length)
const averageDiscount = computed(() => {
  if (!details.value.length) return 0
  const total = details.value.reduce((sum, detail) => sum + detail.discount_percent, 0)
  return Number((total / details.value.length).toFixed(1))
})

const hottestDeals = computed(() => details.value.filter((detail) => detail.discount_percent >= 30).length)
const totalProjectedValue = computed(() =>
  details.value.reduce((sum, detail) => {
    const discountValue = (detail.product_price * detail.discount_percent) / 100
    return sum + discountValue
  }, 0),
)

const pageTitle = computed(() => (isEdit.value ? 'Chỉnh sửa khuyến mãi' : 'Tạo khuyến mãi'))
const pageSubtitle = computed(() =>
  isEdit.value
    ? form.value.name || 'Cập nhật campaign hiện tại'
    : 'Thiết lập campaign giảm giá theo sản phẩm với bố cục dễ kiểm soát hơn',
)

const canSave = computed(() =>
  !!form.value.name.trim()
  && details.value.length > 0
  && !saving.value,
)

const editorTip = computed(() => {
  if (hottestDeals.value > 0) {
    return `${formatNumber(hottestDeals.value)} sản phẩm đang có mức giảm từ 30% trở lên, rất hợp để đẩy vào khu “deal hot”.`
  }

  if (!details.value.length) {
    return 'Bắt đầu bằng 3-5 sản phẩm chủ lực sẽ giúp khách nhận ra chiến dịch nhanh hơn thay vì áp quá rộng.'
  }

  return 'Giữ một dải giảm giá từ 10% đến 25% thường giúp campaign trông hợp lý và ít phá biên lợi nhuận hơn.'
})

const scheduleText = computed(() => {
  if (!form.value.start_date && !form.value.end_date) return 'Không giới hạn thời gian'
  if (form.value.start_date && !form.value.end_date) return 'Bắt đầu theo ngày cấu hình, chưa đặt ngày kết thúc'
  if (!form.value.start_date && form.value.end_date) return 'Đang mở ngay và sẽ dừng ở ngày kết thúc'
  return 'Đã lên lịch đầy đủ cho campaign'
})

const fetchAllProducts = async () => {
  const pageSize = 100
  let page = 1
  let totalPages = 1
  const items: Product[] = []

  do {
    const { data } = await productService.getAll({
      page,
      limit: pageSize,
      sort_by: 'name',
      sort_order: 'asc',
    })
    const payload = data.data || {}
    const chunk = payload.data || payload.items || payload || []
    items.push(...chunk)
    totalPages = Number(payload.meta?.total_pages ?? payload.meta?.totalPages ?? 1)
    page += 1
  } while (page <= totalPages)

  return items
}

const fetchData = async () => {
  loading.value = true
  try {
    allProducts.value = await fetchAllProducts()

    if (isEdit.value) {
      const { data } = await promotionService.getById(route.params.id as string)
      const promotion = data.data

      form.value = {
        name: promotion.name,
        description: promotion.description || '',
        start_date: promotion.start_date ? new Date(promotion.start_date) : null,
        end_date: promotion.end_date ? new Date(promotion.end_date) : null,
        is_active: promotion.is_active,
      }

      details.value = (promotion.details || []).map(mapPromotionDetail)
      originalDetails.value = details.value.map((detail) => ({ ...detail }))
    } else {
      originalDetails.value = []
    }
  } catch {
    toast.error('Không thể tải dữ liệu khuyến mãi')
  } finally {
    loading.value = false
  }
}

const addSelectedProducts = () => {
  for (const product of modalSelectedProducts.value) {
    if (!selectedProductIds.value.has(product.id)) {
      details.value.unshift(mapProductToDetail(product))
    }
  }
  showProductModal.value = false
  modalSelectedProducts.value = []
  modalSearch.value = ''
  modalCategory.value = null
}

const removeDetail = (productId: string) => {
  details.value = details.value.filter((detail) => detail.product_id !== productId)
}

const resetLocalState = () => {
  if (isEdit.value) {
    details.value = originalDetails.value.map((detail) => ({ ...detail }))
  } else {
    details.value = []
  }
}

const validateForm = () => {
  if (!form.value.name.trim()) {
    toast.warn('Tên khuyến mãi không được để trống')
    return false
  }

  if (!details.value.length) {
    toast.warn('Phải có ít nhất 1 sản phẩm áp dụng')
    return false
  }

  if (
    form.value.start_date
    && form.value.end_date
    && form.value.end_date.getTime() <= form.value.start_date.getTime()
  ) {
    toast.warn('Ngày kết thúc phải sau ngày bắt đầu')
    return false
  }

  if (details.value.some((detail) => detail.discount_percent <= 0 || detail.discount_percent > 100)) {
    toast.warn('Phần trăm giảm phải nằm trong khoảng 1% đến 100%')
    return false
  }

  return true
}

const syncDetailsForEdit = async () => {
  const promotionId = route.params.id as string
  const originalMap = new Map(originalDetails.value.map((detail) => [detail.product_id, detail]))
  const currentMap = new Map(details.value.map((detail) => [detail.product_id, detail]))

  const addTasks = details.value
    .filter((detail) => !originalMap.has(detail.product_id))
    .map((detail) =>
      promotionService.addProduct(promotionId, {
        product_id: detail.product_id,
        discount_percent: detail.discount_percent,
      }),
    )

  const updateTasks = details.value
    .filter((detail) => {
      const original = originalMap.get(detail.product_id)
      return original && original.discount_percent !== detail.discount_percent
    })
    .map((detail) =>
      promotionService.updateProduct(promotionId, detail.product_id, {
        discount_percent: detail.discount_percent,
      }),
    )

  const removeTasks = originalDetails.value
    .filter((detail) => !currentMap.has(detail.product_id))
    .map((detail) => promotionService.removeProduct(promotionId, detail.product_id))

  await Promise.all([...addTasks, ...updateTasks, ...removeTasks])
}

const handleSubmit = async () => {
  if (!validateForm()) return

  saving.value = true
  try {
    if (isEdit.value) {
      await promotionService.update(route.params.id as string, {
        name: form.value.name.trim(),
        description: form.value.description.trim() || null,
        start_date: form.value.start_date?.toISOString() || null,
        end_date: form.value.end_date?.toISOString() || null,
        is_active: form.value.is_active,
      })
      await syncDetailsForEdit()
      toast.success('Đã cập nhật khuyến mãi')
    } else {
      const dto: CreatePromotionDto = {
        name: form.value.name.trim(),
        description: form.value.description.trim() || null,
        start_date: form.value.start_date?.toISOString() || null,
        end_date: form.value.end_date?.toISOString() || null,
        is_active: form.value.is_active,
        details: details.value.map((detail) => ({
          product_id: detail.product_id,
          discount_percent: detail.discount_percent,
        })),
      }
      await promotionService.create(dto)
      toast.success('Đã tạo khuyến mãi thành công')
    }

    router.push('/promotions')
  } catch (error: any) {
    toast.error('Lỗi', error?.response?.data?.message || 'Không thể lưu khuyến mãi')
  } finally {
    saving.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div v-if="loading" class="editor-loading">
    <i class="pi pi-spin pi-spinner"></i>
  </div>

  <div v-else class="promotion-editor">
    <section class="page-header">
      <div class="editor-header-copy">
        <button type="button" class="back-btn" @click="router.push('/promotions')">
          <i class="pi pi-arrow-left"></i>
        </button>

        <div>
          <h1 class="page-title">{{ pageTitle }}</h1>
          <p class="page-subtitle">{{ pageSubtitle }}</p>
        </div>
      </div>

      <Button
        :label="isEdit ? 'Lưu thay đổi' : 'Tạo khuyến mãi'"
        class="btn-create-unified"
        :loading="saving"
        :disabled="!canSave"
        @click="handleSubmit"
      />
    </section>

    <div class="editor-breadcrumb">
      <span>Khuyến mãi</span>
      <i class="pi pi-angle-right"></i>
      <strong>{{ form.name || (isEdit ? 'Chiến dịch hiện tại' : 'Chiến dịch mới') }}</strong>
    </div>

    <section class="editor-grid">
      <div class="left-rail">
        <article class="panel-card info-card">
          <div class="panel-head">
            <p class="panel-overline">Thông tin chung</p>
          </div>

          <div class="field-stack">
            <label>Tên khuyến mãi</label>
            <InputText v-model="form.name" class="w-full" placeholder="Ví dụ: Summer Solstice Flash Sale" />
          </div>

          <div class="field-stack">
            <label>Mô tả</label>
            <Textarea
              v-model="form.description"
              rows="4"
              autoResize
              class="w-full"
              placeholder="Mô tả ngắn về campaign, nhóm sản phẩm và thông điệp chính..."
            />
          </div>

          <div class="date-grid">
            <div class="field-stack">
              <label>Ngày bắt đầu</label>
              <DatePicker v-model="form.start_date" dateFormat="dd/mm/yy" showIcon class="w-full" />
            </div>

            <div class="field-stack">
              <label>Ngày kết thúc</label>
              <DatePicker v-model="form.end_date" dateFormat="dd/mm/yy" showIcon class="w-full" />
            </div>
          </div>

          <div class="activation-card">
            <div>
              <strong>Trạng thái hoạt động</strong>
              <p>{{ form.is_active ? 'Khách sẽ thấy giá khuyến mãi khi campaign còn hiệu lực.' : 'Campaign đang ở trạng thái ẩn và chưa áp dụng ở storefront.' }}</p>
            </div>
            <ToggleSwitch v-model="form.is_active" />
          </div>

          <div class="schedule-note">
            <i class="pi pi-calendar"></i>
            <span>{{ scheduleText }}</span>
          </div>
        </article>

        <article class="panel-card performance-card">
          <p class="panel-overline">Hiệu suất tạm tính</p>
          <strong class="performance-value">{{ formatNumber(selectedCount) }}</strong>
          <span class="performance-metric">
            {{ averageDiscount ? `${averageDiscount}% giảm trung bình` : 'Chưa có sản phẩm áp dụng' }}
          </span>
          <p class="performance-copy">
            Giá trị giảm tối đa đang phân bổ khoảng {{ formatVND(totalProjectedValue) }} trên tổng danh sách hiện tại.
          </p>
        </article>
      </div>

      <div class="right-rail">
        <article class="panel-card products-card">
          <div class="products-head">
            <div>
              <p class="panel-overline">Sản phẩm áp dụng</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="count-chip">{{ formatNumber(selectedCount) }} sản phẩm</span>
              <Button label="Chọn sản phẩm" icon="pi pi-plus" size="small" class="btn-gradient" @click="showProductModal = true" />
            </div>
          </div>

          <div v-if="!details.length" class="products-empty">
            <i class="pi pi-tags"></i>
            <strong>Chưa có sản phẩm nào trong campaign</strong>
            <span>Tìm sản phẩm ở ô phía trên để thêm vào danh sách khuyến mãi.</span>
          </div>

          <div v-else class="product-list">
            <article
              v-for="detail in details"
              :key="detail.product_id"
              class="product-item"
            >
              <div class="product-main">
                <div class="product-thumb">
                  <img v-if="detail.product_image" :src="detail.product_image" :alt="detail.product_name" />
                  <i v-else class="pi pi-image"></i>
                </div>

                <div class="product-copy">
                  <strong>{{ detail.product_name }}</strong>
                  <span>Mã SP: {{ detail.product_code }}</span>
                  <span>{{ detail.category_name || 'Áp dụng theo sản phẩm cụ thể' }}</span>
                </div>
              </div>

              <div class="discount-editor">
                <label>Giảm %</label>
                <div class="discount-input-wrap">
                  <InputNumber
                    v-model="detail.discount_percent"
                    :min="1"
                    :max="100"
                    suffix="%"
                    class="discount-input"
                  />
                </div>
              </div>

              <button type="button" class="remove-btn" @click="removeDetail(detail.product_id)">
                <i class="pi pi-trash"></i>
              </button>
            </article>
          </div>

          <div class="products-footer">
            <span>Thay đổi danh sách sẽ được lưu cùng campaign khi bạn bấm xác nhận.</span>
            <div class="footer-actions">
              <button type="button" class="ghost-link" @click="resetLocalState">Khôi phục danh sách</button>
              <Button
                :label="isEdit ? 'Cập nhật khuyến mãi' : 'Lưu campaign'"
                class="products-save-btn"
                :loading="saving"
                :disabled="!canSave"
                @click="handleSubmit"
              />
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="insight-grid">
      <article class="insight-card tip-card">
        <div class="insight-icon">
          <i class="pi pi-lightbulb"></i>
        </div>
        <div class="insight-copy">
          <strong>Editor's tip</strong>
          <p>{{ editorTip }}</p>
        </div>
      </article>

      <article class="insight-card lock-card">
        <div class="insight-icon">
          <i class="pi pi-lock"></i>
        </div>
        <div class="insight-copy">
          <strong>Kiểm soát campaign</strong>
          <p>Khi chỉnh khuyến mãi, chỉ các sản phẩm trong danh sách bên phải mới bị ảnh hưởng. Mỗi thay đổi % giảm sẽ được đồng bộ lại khi lưu.</p>
        </div>
      </article>
    </section>

    <Dialog v-model:visible="showProductModal" modal dismissableMask header="Chọn sản phẩm áp dụng khuyến mãi" :style="{ width: '860px', maxWidth: '96vw' }">
      <div class="modal-toolbar">
        <div class="search-input-wrap">
          <i class="pi pi-search search-icon"></i>
          <InputText v-model="modalSearch" placeholder="Tìm sản phẩm..." class="w-full pl-10" />
        </div>
        <Select v-model="modalCategory" :options="productCategories" optionLabel="name" optionValue="id" placeholder="Tất cả danh mục" showClear class="w-64" />
      </div>

      <DataTable :value="modalFilteredProducts" v-model:selection="modalSelectedProducts" dataKey="id" :paginator="true" :rows="5" stripedRows>
        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
        <Column header="Sản phẩm">
          <template #body="{ data }">
            <div class="flex items-center gap-3 py-1">
              <div class="w-10 h-10 rounded overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
                <img v-if="data.images?.[0]?.image_url" :src="data.images[0].image_url" class="w-full h-full object-cover" />
                <i v-else class="pi pi-image text-gray-400"></i>
              </div>
              <span class="font-bold text-gray-800">{{ data.name }}</span>
            </div>
          </template>
        </Column>
        <Column field="category.name" header="Danh mục">
          <template #body="{ data }">
            <span class="text-sm text-gray-600">{{ data.category?.name || '—' }}</span>
          </template>
        </Column>
        <Column header="Giá bán">
          <template #body="{ data }">
            <span class="font-bold text-primary">{{ formatVND(data.base_price) }}</span>
          </template>
        </Column>
        <template #empty>
          <div class="p-4 text-center text-gray-500">
            Không tìm thấy sản phẩm nào phù hợp
          </div>
        </template>
      </DataTable>

      <template #footer>
        <div class="flex justify-between items-center w-full mt-2">
          <span class="text-sm text-gray-500">Đã chọn <strong>{{ modalSelectedProducts.length }}</strong> sản phẩm</span>
          <div class="flex gap-2">
            <Button label="Hủy" text severity="secondary" @click="showProductModal = false" />
            <Button label="Xác nhận thêm" class="btn-gradient" :disabled="!modalSelectedProducts.length" @click="addSelectedProducts" />
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.promotion-editor {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  color: var(--primary);
  font-size: 2rem;
}

.editor-header-copy {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.back-btn {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #334155;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.back-btn:hover {
  color: var(--primary);
  border-color: rgba(255, 107, 43, 0.24);
  box-shadow: 0 10px 22px rgba(255, 107, 43, 0.12);
}

.editor-breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.82rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #a08c86;
}

.editor-breadcrumb strong {
  color: #111827;
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.82fr) minmax(0, 1.18fr);
  gap: 20px;
  align-items: start;
}

.left-rail,
.right-rail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.92));
  border: 1px solid #edf2f7;
  border-radius: 28px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.04);
}

.info-card,
.products-card {
  padding: 26px;
}

.performance-card {
  padding: 28px;
  background: linear-gradient(180deg, rgba(231, 236, 255, 0.88), rgba(240, 244, 255, 0.96));
}

.panel-head {
  margin-bottom: 22px;
}

.panel-overline {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #b23b0b;
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}

.field-stack label {
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #3f2a21;
}

.field-stack :deep(.p-inputtext),
.field-stack :deep(.p-inputnumber-input),
.field-stack :deep(.p-textarea),
.field-stack :deep(.p-datepicker-input) {
  min-height: 56px;
  border-radius: 16px;
  border-color: #e2e8f0;
  background: #f8fbff;
}

.field-stack :deep(.p-textarea) {
  min-height: 132px;
}

.date-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.activation-card {
  margin-top: 10px;
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

.schedule-note {
  margin-top: 16px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #64748b;
}

.performance-value {
  display: block;
  margin-top: 14px;
  font-size: clamp(2.1rem, 4vw, 2.8rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  color: #0f172a;
}

.performance-metric {
  display: inline-flex;
  margin-top: 10px;
  font-weight: 800;
  color: #c2410c;
}

.performance-copy {
  margin-top: 16px;
  color: #475569;
  line-height: 1.8;
}

.products-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.count-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 6px 14px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3f2a21;
  font-weight: 800;
}

.search-add-box {
  position: relative;
  margin-bottom: 16px;
}

.search-add-box i {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  z-index: 1;
}

.product-search-input {
  width: 100%;
}

.product-search-input :deep(.p-inputtext) {
  width: 100%;
  min-height: 58px;
  padding-left: 44px;
  border-radius: 18px;
  border-color: #dbe5f1;
  background: #f7f9ff;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
  padding: 10px;
  border-radius: 20px;
  background: #f8fbff;
  border: 1px solid #e2e8f0;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  border: none;
  background: #fff;
  text-align: left;
  transition: all 0.2s ease;
}

.result-item:hover {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.result-thumb,
.product-thumb {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  overflow: hidden;
  background: #f8fafc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  flex-shrink: 0;
}

.result-thumb {
  width: 56px;
  height: 56px;
  border-radius: 14px;
}

.result-thumb img,
.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-copy,
.product-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.result-copy strong,
.product-copy strong {
  font-size: 1.02rem;
  color: #111827;
}

.result-copy span,
.product-copy span {
  color: #64748b;
  line-height: 1.5;
}

.result-price {
  margin-left: auto;
  font-weight: 800;
  color: #0f172a;
}

.products-empty {
  padding: 48px 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.9), rgba(255, 255, 255, 0.96));
  border: 1px dashed #dbe5f1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  color: #64748b;
}

.products-empty i {
  font-size: 1.5rem;
  color: var(--primary);
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.product-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px 42px;
  gap: 16px;
  align-items: center;
  padding: 18px;
  border-radius: 24px;
  background: #fff;
  border: 1px solid #edf2f7;
}

.product-main {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.discount-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.discount-editor label {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7c5e51;
}

.discount-input-wrap {
  width: 100%;
}

.discount-input {
  width: 100%;
}

.discount-input :deep(.p-inputnumber-input) {
  width: 100%;
  min-height: 48px;
  text-align: center;
  font-weight: 800;
  border-radius: 14px;
  border-color: #d9e1ee;
  background: #f8fbff;
}

.remove-btn {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: none;
  background: #fff1f2;
  color: #dc2626;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background: #fee2e2;
}

.products-footer {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #edf2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.products-footer span {
  color: #64748b;
  line-height: 1.6;
}

.modal-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.search-input-wrap {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  z-index: 1;
}

.search-input-wrap :deep(.p-inputtext) {
  padding-left: 40px;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.ghost-link {
  border: none;
  background: transparent;
  color: #334155;
  font-weight: 700;
}

.ghost-link:hover {
  color: var(--primary);
}

.products-save-btn {
  min-width: 170px;
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.insight-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 24px;
  border-radius: 26px;
  border: 1px solid #edf2f7;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
}

.tip-card {
  background: linear-gradient(180deg, rgba(255, 246, 210, 0.94), rgba(255, 253, 244, 0.98));
}

.lock-card {
  background: linear-gradient(180deg, rgba(231, 244, 255, 0.92), rgba(246, 251, 255, 0.98));
}

.insight-icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.insight-copy strong {
  display: block;
  font-size: 1rem;
  color: #0f172a;
}

.insight-copy p {
  margin-top: 8px;
  color: #475569;
  line-height: 1.75;
}

@media (max-width: 1180px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .insight-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .page-header,
  .products-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header .btn-create-unified,
  .products-save-btn {
    width: 100%;
  }

  .footer-actions {
    justify-content: space-between;
  }
}

@media (max-width: 720px) {
  .editor-header-copy,
  .product-item {
    grid-template-columns: 1fr;
  }

  .editor-header-copy {
    display: flex;
    flex-direction: column;
  }

  .date-grid {
    grid-template-columns: 1fr;
  }

  .product-item {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .product-main {
    align-items: flex-start;
  }

  .remove-btn {
    align-self: flex-end;
  }
}

@media (max-width: 560px) {
  .promotion-editor {
    gap: 18px;
  }

  .panel-card,
  .insight-card {
    border-radius: 22px;
  }

  .info-card,
  .products-card,
  .performance-card {
    padding: 20px;
  }

}
</style>
