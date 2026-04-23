<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productService } from '@/services/product.service'
import { categoryService, type Category } from '@/services/category.service'
import { attributeService, type Attribute } from '@/services/attribute.service'
import { useFormDraftStore } from '@/stores/form-draft.store'
import { useAppToast } from '@/composables/useToast'
import { mapCategoryOptionsWithPath } from '@/utils/category'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'

const route = useRoute()
const router = useRouter()
const toast = useAppToast()
const draftStore = useFormDraftStore()
const cloneDraftValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const isEdit = computed(() => !!route.params.id)
const draftKey = computed(() => isEdit.value ? `product:edit:${route.params.id}` : 'product:create')
const loading = ref(false)
const saving = ref(false)
const activeTab = ref(1) // 1 = Info, 2 = Images, 3 = Variants
const categories = ref<Category[]>([])
const attributes = ref<Attribute[]>([])

// Form
const form = ref({
  name: '',
  slug: '',
  description: '',
  base_price: 0,
  category_id: null as string | null,
  material: '',
  has_variant: false,
  is_active: true,
})

const images = ref<File[]>([])
const imagePreviews = ref<string[]>([])
const existingImages = ref<Array<{ id: string; image_url: string; is_primary?: boolean }>>([])

type VariantSelectionForm = {
  attribute_id: string | null
  attribute_value_id: string | null
}

type VariantForm = {
  id?: string
  sku_code: string
  price: number | null
  stock: number
  image_url: string | null
  is_active: boolean
  attribute_selections: VariantSelectionForm[]
}

const createEmptySelection = (): VariantSelectionForm => ({
  attribute_id: null,
  attribute_value_id: null,
})

const createEmptyVariant = (): VariantForm => ({
  sku_code: '',
  price: null,
  stock: 0,
  image_url: null,
  is_active: true,
  attribute_selections: [createEmptySelection()],
})

const variants = ref<VariantForm[]>([])
const initialVariantIds = ref<string[]>([])
const variantImageInputs = ref<Array<HTMLInputElement | null>>([])
const variantImageUploading = ref<Record<number, boolean>>({})

const addVariant = () => {
  variants.value.push(createEmptyVariant())
}

const removeVariant = (i: number) => {
  variants.value.splice(i, 1)
}

const attributeValueToAttributeMap = computed(() => {
  const map = new Map<string, string>()
  attributes.value.forEach((attribute) => {
    attribute.values.forEach((value) => {
      map.set(value.id, attribute.id)
    })
  })
  return map
})

const normalizePrice = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

const normalizeStock = (value: unknown) => {
  const next = Number(value)
  return Number.isFinite(next) && next >= 0 ? Math.trunc(next) : 0
}

const normalizeVariantAttributeValueIds = (ids: string[]) => {
  const selectedByAttribute = new Map<string, string>()

  ids.forEach((id) => {
    const attributeId = attributeValueToAttributeMap.value.get(id)
    if (!attributeId) return
    if (!selectedByAttribute.has(attributeId)) {
      selectedByAttribute.set(attributeId, id)
    }
  })

  return Array.from(selectedByAttribute.values())
}

const normalizeVariantSelections = (selections: VariantSelectionForm[]): VariantSelectionForm[] => {
  const seen = new Set<string>()

  return selections.reduce<VariantSelectionForm[]>((acc, selection) => {
    const attributeId = selection.attribute_id || null
    const valueId = selection.attribute_value_id || null
    const mappedAttributeId = valueId ? attributeValueToAttributeMap.value.get(valueId) || null : null
    const finalAttributeId = mappedAttributeId || attributeId

    if (!finalAttributeId || seen.has(finalAttributeId)) {
      return acc
    }

    seen.add(finalAttributeId)
    acc.push({
      attribute_id: finalAttributeId,
      attribute_value_id: mappedAttributeId === finalAttributeId ? valueId : null,
    })
    return acc
  }, [])
}

const serializeVariantAttributeValueIds = (variant: VariantForm) =>
  normalizeVariantSelections(variant.attribute_selections)
    .map((selection) => selection.attribute_value_id)
    .filter((valueId): valueId is string => !!valueId)

const toVariantSelections = (ids: string[]): VariantSelectionForm[] => {
  const selections = normalizeVariantAttributeValueIds(ids).map((id) => ({
    attribute_id: attributeValueToAttributeMap.value.get(id) || null,
    attribute_value_id: id,
  }))

  return selections.length ? selections : [createEmptySelection()]
}

const getAttributeOptions = () =>
  attributes.value.map((attribute) => ({
    label: attribute.name,
    value: attribute.id,
  }))

const getAttributeValueOptions = (attributeId: string | null) =>
  (attributes.value.find((attribute) => attribute.id === attributeId)?.values || []).map((value) => ({
    label: value.value,
    value: value.id,
  }))

const updateVariantSelectionAttribute = (
  variant: VariantForm,
  selectionIndex: number,
  nextAttributeId: string | null | undefined,
) => {
  const normalizedSelections = normalizeVariantSelections(variant.attribute_selections)
  const nextSelections = normalizedSelections.map((selection, index) =>
    index === selectionIndex
      ? { attribute_id: nextAttributeId || null, attribute_value_id: null }
      : selection,
  )

  if (selectionIndex >= nextSelections.length) {
    nextSelections.push({
      attribute_id: nextAttributeId || null,
      attribute_value_id: null,
    })
  }

  variant.attribute_selections = nextSelections.length ? nextSelections : [createEmptySelection()]
}

const updateVariantSelectionValue = (
  variant: VariantForm,
  selectionIndex: number,
  nextValueId: string | null | undefined,
) => {
  const normalizedSelections = normalizeVariantSelections(variant.attribute_selections)
  const nextSelections = normalizedSelections.map((selection, index) =>
    index === selectionIndex
      ? {
          attribute_id: selection.attribute_id,
          attribute_value_id: nextValueId || null,
        }
      : selection,
  )

  if (selectionIndex >= nextSelections.length) {
    nextSelections.push({
      attribute_id: null,
      attribute_value_id: nextValueId || null,
    })
  }

  variant.attribute_selections = nextSelections.length ? nextSelections : [createEmptySelection()]
}

const addVariantSelection = (variant: VariantForm) => {
  variant.attribute_selections = [
    ...normalizeVariantSelections(variant.attribute_selections),
    createEmptySelection(),
  ]
}

const removeVariantSelection = (variant: VariantForm, selectionIndex: number) => {
  const nextSelections = variant.attribute_selections.filter((_, index) => index !== selectionIndex)
  variant.attribute_selections = nextSelections.length ? nextSelections : [createEmptySelection()]
}

const goToAttributes = () => {
  router.push('/attributes')
}

// Slug auto-generation
watch(() => form.value.name, (val) => {
  if (!isEdit.value) {
    form.value.slug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
})

// Image upload
const fileInput = ref<HTMLInputElement>()

const onFileSelect = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  const remaining = 10 - images.value.length - existingImages.value.length
  const selected = Array.from(files).slice(0, remaining)
  selected.forEach(f => {
    images.value.push(f)
    imagePreviews.value.push(URL.createObjectURL(f))
  })
  // Reset input to allow re-selecting same file
  if (fileInput.value) fileInput.value.value = ''
}

const removeNewImage = (i: number) => {
  const url = imagePreviews.value[i]
  if (url) URL.revokeObjectURL(url)
  images.value.splice(i, 1)
  imagePreviews.value.splice(i, 1)
}

const removeExistingImage = async (img: { id: string; image_url: string }) => {
  if (!route.params.id) return
  try {
    await productService.deleteImage(route.params.id as string, img.id)
    existingImages.value = existingImages.value.filter(i => i.id !== img.id)
    toast.success('Đã xóa ảnh')
  } catch {
    toast.error('Xóa ảnh thất bại')
  }
}

const openVariantImagePicker = (index: number) => {
  variantImageInputs.value[index]?.click()
}

const clearVariantImage = (variant: VariantForm) => {
  variant.image_url = null
}

const onVariantImageSelect = async (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  variantImageUploading.value = { ...variantImageUploading.value, [index]: true }
  try {
    const { data } = await productService.uploadVariantImage(file)
    const targetVariant = variants.value[index]
    if (targetVariant) {
      targetVariant.image_url = data?.data?.url || null
    }
    toast.success('Đã tải ảnh biến thể')
  } catch {
    toast.error('Tải ảnh biến thể thất bại')
  } finally {
    variantImageUploading.value = { ...variantImageUploading.value, [index]: false }
    input.value = ''
  }
}

const isCancelling = ref(false)

const handleCancel = () => {
  isCancelling.value = true
  imagePreviews.value.forEach((url) => URL.revokeObjectURL(url))
  images.value = []
  imagePreviews.value = []
  draftStore.clearDraft(draftKey.value)
  router.push('/products')
}

const hasAttributeValues = computed(() => attributes.value.some((attribute) => attribute.values.length > 0))
const variantActionLabel = computed(() =>
  hasAttributeValues.value && form.value.has_variant ? 'Thêm biến thể' : 'Quản lý thuộc tính',
)

const handleVariantPrimaryAction = () => {
  if (hasAttributeValues.value && form.value.has_variant) {
    addVariant()
    return
  }

  goToAttributes()
}

// Category tree options
const categoryOptions = computed(() => {
  return mapCategoryOptionsWithPath(categories.value)
})

const restoreDraft = () => {
  const draft = draftStore.getDraft<{
    form: typeof form.value
    variants: typeof variants.value
    activeTab: number
  }>(draftKey.value)

  if (!draft) return

  form.value = {
    ...form.value,
    ...draft.form,
  }
  variants.value = (draft.variants || []).map(v => ({
    ...v,
    sku_code: v.sku_code || '',
    price: normalizePrice(v.price),
    stock: normalizeStock(v.stock),
    image_url: (v as any).image_url || null,
    is_active: v.is_active ?? true,
    attribute_selections: normalizeVariantSelections(
      Array.isArray((v as any).attribute_selections)
        ? (v as any).attribute_selections
        : toVariantSelections((v as any).attribute_value_ids || []),
    ),
  }))
  activeTab.value = draft.activeTab || 1
}

const fetchData = async () => {
  loading.value = true
  try {
    const [catRes, attrRes] = await Promise.all([
      categoryService.getAll(),
      attributeService.getAll(),
    ])
    categories.value = catRes.data.data || []
    attributes.value = attrRes.data.data || []

    if (isEdit.value) {
      const { data } = await productService.getById(route.params.id as string)
      const p = data.data
      form.value = {
        name: p.name,
        slug: p.slug || '',
        description: p.description || '',
        base_price: Number(p.base_price) || 0,
        category_id: p.category_id,
        material: p.material || '',
        has_variant: p.has_variant,
        is_active: p.is_active,
      }
      existingImages.value = (p.images || []).map((img: any) => ({
        id: img.id,
        image_url: img.image_url,
        is_primary: img.sort_order === 0,
      }))
      if (p.variants?.length) {
        variants.value = p.variants.map((v: any) => ({
          id: v.id,
          sku_code: v.sku_code || '',
          price: normalizePrice(v.price),
          stock: normalizeStock(v.stock),
          image_url: v.image_url || null,
          is_active: v.is_active,
          attribute_selections: toVariantSelections(v.attribute_values?.map((av: any) => av.id) || []),
        }))
        initialVariantIds.value = p.variants.map((variant: any) => variant.id).filter(Boolean)
      } else {
        initialVariantIds.value = []
      }
    }

    restoreDraft()
  } catch {
    toast.error('Không thể tải dữ liệu')
  } finally {
    loading.value = false
  }
}

const syncVariantsForEdit = async (productId: string) => {
  const currentVariantIds = variants.value
    .map((variant) => variant.id)
    .filter((id): id is string => !!id)

  const removedVariantIds = initialVariantIds.value.filter((id) => !currentVariantIds.includes(id))

  for (const variantId of removedVariantIds) {
    await productService.deleteVariant(productId, variantId)
  }

  for (const variant of variants.value) {
    const payload = {
      sku_code: variant.sku_code.trim() || null,
      price: normalizePrice(variant.price),
      stock: normalizeStock(variant.stock),
      image_url: variant.image_url?.trim() || null,
      attribute_value_ids: serializeVariantAttributeValueIds(variant),
    }

    if (variant.id) {
      await productService.updateVariant(productId, variant.id, payload)
      if (variant.is_active === false) {
        await productService.toggleVariant(productId, variant.id, false)
      } else {
        await productService.toggleVariant(productId, variant.id, true)
      }
      continue
    }

    const { data } = await productService.addVariant(productId, payload)
    const createdId = data?.data?.id as string | undefined
    if (createdId) {
      variant.id = createdId
      if (variant.is_active === false) {
        await productService.toggleVariant(productId, createdId, false)
      }
    }
  }

  initialVariantIds.value = variants.value
    .map((variant) => variant.id)
    .filter((id): id is string => !!id)
}

const handleSubmit = async () => {
  const normalizedBasePrice = normalizePrice(form.value.base_price)
  if (!form.value.name.trim()) {
    toast.warn('Tên sản phẩm không được để trống')
    activeTab.value = 1
    return
  }
  if (!normalizedBasePrice || normalizedBasePrice <= 0) {
    toast.warn('Giá phải lớn hơn 0')
    activeTab.value = 1
    return
  }

  form.value.base_price = normalizedBasePrice

  if (form.value.has_variant) {
    if (!variants.value.length) {
      toast.warn('Sản phẩm có biến thể phải có ít nhất 1 biến thể')
      activeTab.value = 3
      return
    }

    const invalidVariantIndex = variants.value.findIndex((variant) => {
      variant.attribute_selections = normalizeVariantSelections(variant.attribute_selections)
      variant.price = normalizePrice(variant.price)
      variant.stock = normalizeStock(variant.stock)
      return !serializeVariantAttributeValueIds(variant).length
    })
    if (invalidVariantIndex >= 0) {
      toast.warn(`Biến thể #${invalidVariantIndex + 1} chưa chọn thuộc tính`)
      activeTab.value = 3
      return
    }
  }

  saving.value = true
  try {
    if (isEdit.value) {
      const payload = {
        name: form.value.name,
        description: form.value.description || null,
        base_price: normalizedBasePrice,
        category_id: form.value.category_id,
        material: form.value.material || null,
      }

      if (images.value.length) {
        const fd = new FormData()
        fd.append('name', payload.name)
        fd.append('base_price', String(payload.base_price))
        fd.append('description', payload.description || '')
        fd.append('category_id', payload.category_id || '')
        fd.append('material', payload.material || '')
        images.value.forEach(f => fd.append('images', f))
        await productService.update(route.params.id as string, fd)
      } else {
        await productService.update(route.params.id as string, payload)
      }

      if (form.value.has_variant) {
        await syncVariantsForEdit(route.params.id as string)
      }
      toast.success('Cập nhật thành công')
    } else {
      const fd = new FormData()
      fd.append('name', form.value.name)
      fd.append('base_price', String(normalizedBasePrice))
      if (form.value.description) fd.append('description', form.value.description)
      if (form.value.category_id) fd.append('category_id', form.value.category_id)
      if (form.value.material) fd.append('material', form.value.material)
      fd.append('has_variant', String(form.value.has_variant))

      if (form.value.has_variant && variants.value.length) {
        fd.append('variants', JSON.stringify(variants.value.map(v => ({
          ...v,
          sku_code: v.sku_code.trim() || null,
          price: normalizePrice(v.price),
          stock: normalizeStock(v.stock),
          image_url: v.image_url?.trim() || null,
          attribute_value_ids: serializeVariantAttributeValueIds(v),
        }))))
      }

      images.value.forEach(f => fd.append('images', f))
      await productService.create(fd)
      toast.success('Tạo sản phẩm thành công')
    }
    draftStore.clearDraft(draftKey.value)
    router.push('/products')
  } catch (err: any) {
    toast.error('Lỗi', err.response?.data?.message || 'Thao tác thất bại')
  } finally {
    saving.value = false
  }
}

const totalImagesCount = computed(() => images.value.length + existingImages.value.length)

watch(
  [form, variants, activeTab],
  () => {
    if (loading.value || isCancelling.value) return

    draftStore.setDraft(draftKey.value, {
      form: cloneDraftValue(form.value),
      variants: cloneDraftValue(variants.value),
      activeTab: activeTab.value,
    })
  },
  { deep: true },
)

onMounted(fetchData)
</script>

<template>
  <div v-if="loading" class="loading-wrap">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
  </div>

  <div v-else class="product-form-page">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <router-link to="/products" class="breadcrumb-link">Sản phẩm</router-link>
      <i class="pi pi-chevron-right breadcrumb-sep"></i>
      <span class="breadcrumb-current">{{ isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới' }}</span>
    </div>

    <h1 class="form-title">Chi tiết Sản phẩm</h1>

    <!-- Step Tabs -->
    <div class="step-tabs">
      <button type="button" class="step-tab" :class="{ active: activeTab === 1 }" @click="activeTab = 1">
        <span class="step-number" :class="{ done: activeTab > 1 }">
          <i v-if="activeTab > 1" class="pi pi-check"></i>
          <span v-else>1</span>
        </span>
        <span class="step-label">Thông tin cơ bản</span>
      </button>
      <div class="step-line"></div>
      <button type="button" class="step-tab" :class="{ active: activeTab === 2 }" @click="activeTab = 2">
        <span class="step-number" :class="{ done: activeTab > 2 }">
          <i v-if="activeTab > 2" class="pi pi-check"></i>
          <span v-else>2</span>
        </span>
        <span class="step-label">Hình ảnh</span>
      </button>
      <div class="step-line"></div>
      <button type="button" class="step-tab" :class="{ active: activeTab === 3 }" @click="activeTab = 3">
        <span class="step-number">3</span>
        <span class="step-label">Biến thể</span>
      </button>
    </div>

    <form @submit.prevent="handleSubmit">
      <!-- TAB 1: Info -->
      <div v-show="activeTab === 1" class="tab-content fade-in-up">
        <div class="app-card form-card">
          <!-- Identity Section -->
          <div class="form-section">
            <div class="section-header">
              <h3 class="section-title">Định danh sản phẩm</h3>
              <p class="section-desc">Thông tin này giúp khách hàng nhận diện và tìm kiếm sản phẩm của bạn dễ dàng hơn.</p>
            </div>
            <div class="form-grid">
              <div class="form-field">
                <label class="field-label">TÊN SẢN PHẨM *</label>
                <InputText v-model="form.name" placeholder="VD: Premium Silk Blazer" class="w-full" />
              </div>
              <div class="form-field">
                <label class="field-label">ĐƯỜNG DẪN (SLUG)</label>
                <InputText v-model="form.slug" placeholder="auto-generated" class="w-full slug-input" />
              </div>
            </div>
            <div class="form-field mt-4">
              <label class="field-label">DANH MỤC SẢN PHẨM</label>
              <Select
                v-model="form.category_id"
                :options="categoryOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Chọn danh mục"
                showClear
                class="w-full"
              />
            </div>
            <div class="form-field mt-4">
              <label class="field-label">MÔ TẢ SẢN PHẨM</label>
              <Textarea v-model="form.description" rows="4" class="w-full" placeholder="Mô tả chi tiết về sản phẩm..." />
            </div>
          </div>

          <div class="section-divider"></div>

          <!-- Price Section -->
          <div class="form-section">
            <div class="section-header">
              <h3 class="section-title">Thuộc tính & Giá</h3>
              <p class="section-desc">Thiết lập mức giá cơ sở và các thông tin kỹ thuật của vật liệu.</p>
            </div>
            <div class="form-grid form-grid-3">
              <div class="form-field">
                <label class="field-label">GIÁ BÁN LẺ (VND) *</label>
                <InputNumber v-model="form.base_price" mode="currency" currency="VND" locale="vi-VN" class="w-full price-input" />
              </div>
              <div class="form-field">
                <label class="field-label">CHẤT LIỆU</label>
                <InputText v-model="form.material" placeholder="VD: 100% Mulberry Silk" class="w-full" />
              </div>
            </div>
          </div>

          <div class="section-divider"></div>

          <!-- Active Status -->
          <div class="form-section">
            <div class="status-row">
              <div class="status-info">
                <div class="status-dot" :class="form.is_active ? 'dot-green' : 'dot-gray'"></div>
                <div>
                  <p class="status-title">Trạng thái kinh doanh</p>
                  <p class="status-desc">Hiển thị hoặc ẩn sản phẩm này trên cửa hàng trực tuyến.</p>
                </div>
              </div>
              <ToggleSwitch v-model="form.is_active" />
            </div>
          </div>
        </div>

        <!-- Bottom Actions -->
        <div class="form-actions">
          <Button label="Hủy bỏ" severity="secondary" text @click="handleCancel" />
          <Button label="LƯU THAY ĐỔI" class="btn-gradient" :loading="saving" type="submit" />
        </div>
      </div>

      <!-- TAB 2: Images -->
      <div v-show="activeTab === 2" class="tab-content fade-in-up">
        <div class="app-card form-card">
          <div class="form-section">
            <div class="section-header">
              <div>
                <h3 class="section-title">Hình ảnh sản phẩm</h3>
                <p class="section-desc">Tải lên tối đa 10 hình ảnh chất lượng cao. Ảnh đầu tiên sẽ là ảnh đại diện.</p>
              </div>
              <button
                type="button"
                class="upload-action-btn"
                v-if="totalImagesCount < 10"
                @click="fileInput?.click()"
              >
                <i class="pi pi-upload"></i>
                Tải ảnh mới
              </button>
            </div>

            <div class="image-grid">
              <!-- Existing images -->
              <div v-for="(img, idx) in existingImages" :key="img.id" class="image-item" :class="{ 'is-primary': idx === 0 }">
                <img :src="img.image_url" />
                <div v-if="idx === 0" class="primary-badge">ẢNH CHÍNH</div>
                <button type="button" class="image-delete" @click="removeExistingImage(img)">
                  <i class="pi pi-times"></i>
                </button>
              </div>

              <!-- New previews -->
              <div v-for="(preview, i) in imagePreviews" :key="'new-' + i" class="image-item">
                <img :src="preview" />
                <button type="button" class="image-delete" @click="removeNewImage(i)">
                  <i class="pi pi-times"></i>
                </button>
              </div>

              <!-- Upload placeholder -->
              <button
                v-if="totalImagesCount < 10"
                type="button"
                class="image-upload-btn"
                @click="fileInput?.click()"
              >
                <i class="pi pi-cloud-upload"></i>
                <span>THÊM ẢNH</span>
              </button>
            </div>

            <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onFileSelect" />
          </div>
        </div>

        <div class="form-actions">
          <Button label="Hủy bỏ" severity="secondary" text @click="handleCancel" />
          <Button label="LƯU THAY ĐỔI" class="btn-gradient" :loading="saving" type="submit" />
        </div>
      </div>

      <!-- TAB 3: Variants -->
      <div v-show="activeTab === 3" class="tab-content fade-in-up">
        <div class="app-card form-card">
          <div class="form-section">
            <div class="section-header">
              <div>
                <h3 class="section-title">Quản lý Biến thể</h3>
                <p class="section-desc">Tạo các tổ hợp SKU dựa trên Màu sắc và Kích thước.</p>
              </div>
              <button type="button" class="upload-action-btn" @click="handleVariantPrimaryAction">
                <i :class="hasAttributeValues && form.has_variant ? 'pi pi-plus' : 'pi pi-sliders-h'"></i>
                {{ variantActionLabel }}
              </button>
            </div>

            <!-- Has Variant Toggle -->
            <div class="variant-toggle-row">
              <span class="text-sm">Sản phẩm có biến thể?</span>
              <ToggleSwitch v-model="form.has_variant" />
            </div>

            <div v-if="form.has_variant">
              <div class="variant-toolbar">
                <p class="variant-help">
                  SKU có thể để trống để hệ thống tự sinh. Giá biến thể để trống sẽ dùng giá sản phẩm. Tồn kho nhập riêng cho từng biến thể. Ảnh biến thể sẽ được dùng ở storefront để hiển thị swatch/ảnh theo màu.
                </p>
              </div>
              <div v-if="variants.length" class="variant-list">
                <article v-for="(v, i) in variants" :key="i" class="variant-card">
                  <div class="variant-card-head">
                    <div>
                      <div class="variant-card-kicker">Biến thể {{ i + 1 }}</div>
                      <h4 class="variant-card-title">{{ v.sku_code || 'SKU sẽ được tự sinh khi lưu' }}</h4>
                    </div>
                    <div class="variant-card-actions">
                      <div class="variant-toggle-inline">
                        <span class="variant-inline-label">Kích hoạt</span>
                        <ToggleSwitch v-model="v.is_active" />
                      </div>
                      <button type="button" class="action-btn action-delete" @click="removeVariant(i)">
                        <i class="pi pi-trash"></i>
                      </button>
                    </div>
                  </div>

                  <div class="variant-card-grid">
                    <section class="variant-panel variant-panel-main">
                      <div class="variant-field-group">
                        <label class="variant-block-label">SKU</label>
                        <InputText v-model="v.sku_code" placeholder="Để trống để tự sinh SKU" size="small" class="w-full" />
                      </div>

                      <div class="variant-field-group">
                        <div class="variant-block-header">
                          <label class="variant-block-label">Thuộc tính biến thể</label>
                          <button type="button" class="variant-add-attribute" @click="addVariantSelection(v)">
                            <i class="pi pi-plus"></i>
                            Thêm thuộc tính
                          </button>
                        </div>
                        <div class="variant-attribute-grid">
                          <div
                            v-for="(selection, selectionIndex) in v.attribute_selections"
                            :key="`${i}-${selectionIndex}`"
                            class="variant-attribute-item"
                          >
                            <div class="variant-attribute-head">
                              <div class="variant-attribute-label">Thuộc tính {{ selectionIndex + 1 }}</div>
                              <button
                                v-if="v.attribute_selections.length > 1"
                                type="button"
                                class="variant-attribute-remove"
                                @click="removeVariantSelection(v, selectionIndex)"
                              >
                                <i class="pi pi-times"></i>
                              </button>
                            </div>
                            <div class="variant-attribute-controls">
                              <Select
                                :modelValue="selection.attribute_id"
                                :options="getAttributeOptions()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Chọn thuộc tính"
                                class="w-full variant-select"
                                showClear
                                @update:modelValue="updateVariantSelectionAttribute(v, selectionIndex, $event)"
                              />
                              <Select
                                :modelValue="selection.attribute_value_id"
                                :options="getAttributeValueOptions(selection.attribute_id)"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Chọn giá trị"
                                class="w-full variant-select"
                                :disabled="!selection.attribute_id"
                                showClear
                                @update:modelValue="updateVariantSelectionValue(v, selectionIndex, $event)"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section class="variant-panel">
                      <div class="variant-field-group">
                        <label class="variant-block-label">Ảnh biến thể</label>
                        <div class="variant-image-cell">
                          <div class="variant-image-preview" :class="{ empty: !v.image_url }">
                            <img v-if="v.image_url" :src="v.image_url" alt="variant" />
                            <div v-else class="variant-image-empty-state">
                              <i class="pi pi-image"></i>
                              <span>Chưa có ảnh</span>
                            </div>
                          </div>
                          <div class="variant-image-controls">
                            <InputText
                              v-model="v.image_url"
                              placeholder="https://... hoặc upload ảnh"
                              size="small"
                              class="w-full"
                            />
                            <div class="variant-image-actions">
                              <button
                                type="button"
                                class="variant-upload-btn"
                                :disabled="variantImageUploading[i]"
                                @click="openVariantImagePicker(i)"
                              >
                                <i class="pi pi-upload"></i>
                                {{ variantImageUploading[i] ? 'Đang tải...' : 'Upload ảnh' }}
                              </button>
                              <button
                                v-if="v.image_url"
                                type="button"
                                class="variant-clear-btn"
                                @click="clearVariantImage(v)"
                              >
                                Xóa ảnh
                              </button>
                            </div>
                            <input
                              :ref="(el) => { variantImageInputs[i] = el as HTMLInputElement | null }"
                              type="file"
                              accept="image/*"
                              class="hidden"
                              @change="onVariantImageSelect(i, $event)"
                            />
                            <div class="variant-image-meta">
                              {{ v.image_url ? 'Đã gắn ảnh cho biến thể này.' : 'Có thể để trống khi tạo và bổ sung ảnh sau ở màn chỉnh sửa.' }}
                            </div>
                            <div class="variant-field-hint">Dùng cho swatch hoặc ảnh riêng của SKU.</div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section class="variant-panel variant-panel-compact">
                      <div class="variant-field-group">
                        <label class="variant-block-label">Giá bán (VND)</label>
                        <InputNumber v-model="v.price" mode="currency" currency="VND" locale="vi-VN" size="small" class="w-full" />
                        <div class="variant-field-hint">Trống = dùng giá sản phẩm</div>
                      </div>

                      <div class="variant-field-group">
                        <label class="variant-block-label">Tồn kho</label>
                        <InputNumber v-model="v.stock" :min="0" size="small" class="w-full" />
                        <div class="variant-field-hint">Nhập tồn kho riêng</div>
                      </div>
                    </section>
                  </div>
                </article>
              </div>

              <div v-else class="empty-variants">
                <p>Chưa có biến thể nào.</p>
                <p class="variant-field-hint">Dùng nút phía trên để thêm biến thể hoặc chuyển sang thuộc tính.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <Button label="Hủy bỏ" severity="secondary" text @click="handleCancel" />
          <Button label="LƯU THAY ĐỔI" class="btn-gradient" :loading="saving" type="submit" />
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.product-form-page {
  max-width: 1200px;
}

/* ═══ Breadcrumb ═══ */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.78rem;
}
.breadcrumb-link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { font-size: 0.6rem; color: #CBD5E1; }
.breadcrumb-current { color: #9CA3AF; }

.form-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 20px;
}

/* ═══ Step Tabs ═══ */
.step-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 24px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px 24px;
}
.step-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 8px 4px;
  white-space: nowrap;
}
.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #E5E7EB;
  color: #6B7280;
  font-size: 0.72rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.step-tab.active .step-number {
  background: var(--primary);
  color: #fff;
}
.step-number.done {
  background: #10B981;
  color: #fff;
}
.step-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #9CA3AF;
  transition: color 0.2s;
}
.step-tab.active .step-label {
  color: var(--primary);
}
.step-line {
  flex: 1;
  height: 2px;
  background: #E5E7EB;
  margin: 0 12px;
}

/* ═══ Form Card ═══ */
.form-card {
  padding: 0;
  overflow: hidden;
}
.form-section {
  padding: 28px 28px;
  overflow-x: auto;
}
.section-divider {
  border-top: 1px solid #F3F4F6;
}
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 16px;
}
.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}
.section-desc {
  font-size: 0.78rem;
  color: #9CA3AF;
  margin-top: 4px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-grid-3 {
  grid-template-columns: 1fr 1fr 1fr;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #9CA3AF;
  text-transform: uppercase;
}
.slug-input {
  font-family: monospace;
  font-size: 0.82rem;
  color: #6B7280;
}

.mt-4 { margin-top: 16px; }

/* Price input highlight */
.price-input :deep(.p-inputnumber-input) {
  font-weight: 700;
  color: var(--primary);
  font-size: 1.1rem;
}

/* ═══ Status Row ═══ */
.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-green { background: #10B981; }
.dot-gray { background: #9CA3AF; }
.status-title {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--text-primary);
}
.status-desc {
  font-size: 0.75rem;
  color: #9CA3AF;
  margin-top: 2px;
}

/* ═══ Image Grid ═══ */
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}
.image-item {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #F3F4F6;
  transition: border-color 0.2s;
}
.image-item:hover { border-color: var(--primary); }
.image-item.is-primary { border-color: var(--primary); }
.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.primary-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to right, #FF6B2B, #FFD700);
  color: #fff;
  font-size: 0.56rem;
  font-weight: 700;
  text-align: center;
  padding: 3px;
  letter-spacing: 0.05em;
}
.image-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.9);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  opacity: 0;
  transition: opacity 0.2s;
}
.image-item:hover .image-delete { opacity: 1; }

.image-upload-btn {
  width: 120px;
  height: 120px;
  border: 2px dashed #D1D5DB;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #9CA3AF;
  font-size: 0.68rem;
  font-weight: 600;
  transition: all 0.2s;
}
.image-upload-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: #FFF9F5;
}
.image-upload-btn i { font-size: 1.2rem; }

.upload-action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #FFF7ED;
  color: var(--primary);
  border: 1.5px solid #FFEDD5;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.upload-action-btn:hover {
  background: #FFEDD5;
}

.hidden { display: none; }

/* ═══ Variant Table ═══ */
.variant-header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.variant-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.variant-help {
  font-size: 0.75rem;
  color: #9CA3AF;
  line-height: 1.5;
  max-width: 560px;
}
.variant-field-hint {
  margin-top: 6px;
  font-size: 0.68rem;
  color: #9CA3AF;
}
.variant-attribute-grid {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}
.variant-attribute-item {
  padding: 8px 10px;
  border: 1px solid #F3F4F6;
  border-radius: 10px;
  background: #FAFAFA;
  min-width: 0;
}
.variant-attribute-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.variant-attribute-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: #6B7280;
}
.variant-attribute-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 8px;
  margin-top: 8px;
}
.variant-select {
  min-width: 0;
}
.variant-select :deep(.p-select-label) {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  line-height: 1.35;
  padding-top: 0.55rem;
  padding-bottom: 0.55rem;
}
.variant-select :deep(.p-select-dropdown) {
  align-self: stretch;
}
:global(.p-select-option-label) {
  white-space: normal;
  line-height: 1.35;
}
.variant-attribute-remove {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 999px;
  background: #FEE2E2;
  color: #DC2626;
  cursor: pointer;
}
.variant-add-attribute {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 8px 12px;
  border: 1px dashed #FDBA74;
  border-radius: 999px;
  background: #FFF7ED;
  color: #C2410C;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}
.variant-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0 18px;
  border-bottom: 1px solid #F3F4F6;
  margin-bottom: 20px;
}
.variant-list {
  display: grid;
  gap: 18px;
}
.variant-card {
  border: 1px solid #F1F5F9;
  border-radius: 20px;
  background: linear-gradient(180deg, #FFFFFF 0%, #FFFCF8 100%);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  padding: 20px;
}
.variant-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.variant-card-kicker {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #F97316;
  margin-bottom: 6px;
}
.variant-card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}
.variant-card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.variant-toggle-inline {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 999px;
  background: #FFF7ED;
  border: 1px solid #FED7AA;
}
.variant-inline-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #9A3412;
}
.variant-card-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(320px, 1fr) minmax(220px, 0.8fr);
  gap: 18px;
  align-items: start;
}
.variant-panel {
  min-width: 0;
  padding: 16px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid #F1F5F9;
}
.variant-panel-main {
  background: linear-gradient(180deg, #FFFFFF 0%, #FFFCFA 100%);
}
.variant-panel-compact {
  display: grid;
  gap: 14px;
}
.variant-field-group {
  display: grid;
  gap: 10px;
}
.variant-field-group + .variant-field-group {
  margin-top: 16px;
}
.variant-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.variant-block-label {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94A3B8;
}
.variant-image-cell {
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: 16px;
  align-items: start;
}
.variant-image-preview {
  width: 112px;
  height: 112px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #E5E7EB;
  background: #F8FAFC;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9CA3AF;
}
.variant-image-preview.empty {
  border-style: dashed;
  background: linear-gradient(180deg, #F8FAFC 0%, #FFF7ED 100%);
}
.variant-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.variant-image-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  font-size: 0.68rem;
  line-height: 1.35;
  color: #94A3B8;
  padding: 8px;
}
.variant-image-empty-state i {
  font-size: 1.1rem;
}
.variant-image-controls {
  min-width: 0;
  display: grid;
  gap: 10px;
}
.variant-image-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.variant-upload-btn,
.variant-clear-btn {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #fff;
  padding: 8px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}
.variant-upload-btn {
  color: var(--primary);
  background: #FFF7ED;
  border-color: #FED7AA;
}
.variant-upload-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.variant-upload-btn i {
  margin-right: 6px;
}
.variant-clear-btn {
  color: #DC2626;
}
.variant-image-meta {
  font-size: 0.7rem;
  line-height: 1.45;
  color: #94A3B8;
}
.variant-actions {
  display: flex;
  justify-content: center;
  gap: 4px;
}
.empty-variants {
  text-align: center;
  padding: 40px 20px;
  color: #9CA3AF;
}

/* ═══ Form Actions ═══ */
.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-bottom: 40px;
}

/* ═══ Actions ═══ */
.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #9CA3AF;
  font-size: 0.85rem;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.action-btn:hover { background: #F3F4F6; color: var(--text-primary); }
.action-delete:hover { background: #FEF2F2; color: #EF4444; }

.text-sm { font-size: 0.875rem; }
.text-center { text-align: center; }
.w-full { width: 100%; }

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .form-grid-3 { grid-template-columns: 1fr; }
  .variant-attribute-controls { grid-template-columns: 1fr; }
  .variant-card {
    padding: 16px;
  }
  .variant-card-head,
  .variant-block-header,
  .variant-card-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .variant-card-grid {
    grid-template-columns: 1fr;
  }
  .variant-image-cell { grid-template-columns: 1fr; }
  .step-tabs { overflow-x: auto; }
  .step-label { display: none; }
  .section-header { flex-direction: column; }
  .form-section { padding: 20px 16px; }
}

/* Animation */
.fade-in-up {
  animation: fadeInUp 0.3s ease;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
