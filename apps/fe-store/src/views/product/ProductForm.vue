<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productService } from '@/services/product.service'
import { categoryService, type Category } from '@/services/category.service'
import { attributeService, type Attribute } from '@/services/attribute.service'
import { useAppToast } from '@/composables/useToast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import MultiSelect from 'primevue/multiselect'

const route = useRoute()
const router = useRouter()
const toast = useAppToast()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const saving = ref(false)
const categories = ref<Category[]>([])
const attributes = ref<Attribute[]>([])

// Form
const form = ref({
  name: '',
  description: '',
  base_price: 0,
  category_id: null as string | null,
  material: '',
  has_variant: false,
})

const images = ref<File[]>([])
const imagePreviews = ref<string[]>([])
const existingImages = ref<Array<{ id: string; image_url: string }>>([])

// Variants
const variants = ref<Array<{
  sku_code: string
  price: number | null
  stock: number
  attribute_value_ids: string[]
}>>([])

const addVariant = () => {
  variants.value.push({ sku_code: '', price: null, stock: 0, attribute_value_ids: [] })
}

const removeVariant = (i: number) => {
  variants.value.splice(i, 1)
}

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

// Attribute value options for MultiSelect
const allValueOptions = computed(() => {
  const opts: Array<{ label: string; value: string; group: string }> = []
  attributes.value.forEach(attr => {
    attr.values.forEach(v => {
      opts.push({ label: `${attr.name}: ${v.value}`, value: v.id, group: attr.name })
    })
  })
  return opts
})

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
        description: p.description || '',
        base_price: p.base_price,
        category_id: p.category_id,
        material: p.material || '',
        has_variant: p.has_variant,
      }
      existingImages.value = (p.images || []).map((img: any) => ({ id: img.id, image_url: img.image_url }))
      if (p.variants?.length) {
        variants.value = p.variants.map((v: any) => ({
          sku_code: v.sku_code || '',
          price: v.price,
          stock: v.stock,
          attribute_value_ids: v.attribute_values?.map((av: any) => av.id) || [],
        }))
      }
    }
  } catch {
    toast.error('Không thể tải dữ liệu')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!form.value.name.trim()) {
    toast.warn('Tên sản phẩm không được để trống')
    return
  }
  if (!form.value.base_price || form.value.base_price <= 0) {
    toast.warn('Giá phải lớn hơn 0')
    return
  }

  saving.value = true
  try {
    if (isEdit.value) {
      // Update = JSON (PUT)
      await productService.update(route.params.id as string, {
        name: form.value.name,
        description: form.value.description || null,
        base_price: form.value.base_price,
        category_id: form.value.category_id,
        material: form.value.material || null,
      })
      toast.success('Cập nhật thành công')
    } else {
      // Create = multipart/form-data
      const fd = new FormData()
      fd.append('name', form.value.name)
      fd.append('base_price', String(form.value.base_price))
      if (form.value.description) fd.append('description', form.value.description)
      if (form.value.category_id) fd.append('category_id', form.value.category_id)
      if (form.value.material) fd.append('material', form.value.material)
      fd.append('has_variant', String(form.value.has_variant))

      if (form.value.has_variant && variants.value.length) {
        fd.append('variants', JSON.stringify(variants.value))
      }

      images.value.forEach(f => fd.append('images', f))
      await productService.create(fd)
      toast.success('Tạo sản phẩm thành công')
    }
    router.push('/products')
  } catch (err: any) {
    toast.error('Lỗi', err.response?.data?.message || 'Thao tác thất bại')
  } finally {
    saving.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
  </div>

  <div v-else class="max-w-4xl">
    <div class="flex items-center gap-3 mb-5">
      <Button icon="pi pi-arrow-left" text rounded @click="router.push('/products')" />
      <h2 class="text-lg font-bold" style="color: var(--text-primary)">
        {{ isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm' }}
      </h2>
    </div>

    <form @submit.prevent="handleSubmit">
      <!-- Images -->
      <div class="app-card p-5 mb-5 fade-in-up">
        <h3 class="text-sm font-bold mb-3" style="color: var(--text-primary)">Hình ảnh sản phẩm (tối đa 10)</h3>
        <div class="flex flex-wrap gap-3">
          <!-- Existing images (edit mode) -->
          <div v-for="img in existingImages" :key="img.id" class="relative group">
            <img :src="img.image_url" class="w-24 h-24 rounded-lg object-cover border" />
            <button
              type="button"
              class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              @click="removeExistingImage(img)"
            >✕</button>
          </div>

          <!-- New previews -->
          <div v-for="(preview, i) in imagePreviews" :key="'new-' + i" class="relative group">
            <img :src="preview" class="w-24 h-24 rounded-lg object-cover border" />
            <button
              type="button"
              class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              @click="removeNewImage(i)"
            >✕</button>
          </div>

          <!-- Upload button -->
          <button
            v-if="images.length + existingImages.length < 10"
            type="button"
            class="w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#FF6B2B] transition-colors"
            style="border-color: var(--border); color: var(--text-muted)"
            @click="fileInput?.click()"
          >
            <i class="pi pi-plus" style="font-size: 1.2rem"></i>
            <span class="text-xs">Tải lên</span>
          </button>
          <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onFileSelect" />
        </div>
      </div>

      <!-- Basic Info -->
      <div class="app-card p-5 mb-5 fade-in-up">
        <h3 class="text-sm font-bold mb-3" style="color: var(--text-primary)">Thông tin cơ bản</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1 md:col-span-2">
            <label class="text-xs font-semibold">Tên sản phẩm *</label>
            <InputText v-model="form.name" placeholder="VD: Áo thun cotton" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold">Giá bán *</label>
            <InputNumber v-model="form.base_price" mode="currency" currency="VND" locale="vi-VN" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold">Danh mục</label>
            <Select
              v-model="form.category_id"
              :options="categories"
              optionLabel="name"
              optionValue="id"
              placeholder="Chọn danh mục"
              showClear
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold">Chất liệu</label>
            <InputText v-model="form.material" placeholder="VD: Cotton" class="w-full" />
          </div>
          <div class="flex flex-col gap-1 md:col-span-2">
            <label class="text-xs font-semibold">Mô tả</label>
            <Textarea v-model="form.description" rows="3" class="w-full" />
          </div>
        </div>
      </div>

      <!-- Variants (create mode only) -->
      <div v-if="!isEdit" class="app-card p-5 mb-5 fade-in-up">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold" style="color: var(--text-primary)">Biến thể</h3>
          <div class="flex items-center gap-2">
            <ToggleSwitch v-model="form.has_variant" />
            <span class="text-xs">Có biến thể</span>
          </div>
        </div>

        <div v-if="form.has_variant">
          <div v-for="(v, i) in variants" :key="i" class="flex items-start gap-3 mb-3 p-3 rounded-lg" style="background: #F9FAFB">
            <div class="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
              <InputText v-model="v.sku_code" placeholder="SKU" size="small" />
              <InputNumber v-model="v.price" placeholder="Giá" size="small" mode="currency" currency="VND" locale="vi-VN" />
              <InputNumber v-model="v.stock" placeholder="Tồn kho" size="small" :min="0" />
              <MultiSelect
                v-model="v.attribute_value_ids"
                :options="allValueOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Thuộc tính"
                class="w-full"
                display="chip"
              />
            </div>
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="removeVariant(i)" />
          </div>
          <Button label="Thêm biến thể" icon="pi pi-plus" text size="small" @click="addVariant" />
        </div>
      </div>

      <!-- Submit -->
      <div class="flex justify-end gap-3">
        <Button label="Hủy" severity="secondary" text @click="router.push('/products')" />
        <Button :label="isEdit ? 'Cập nhật' : 'Tạo sản phẩm'" class="btn-gradient" :loading="saving" type="submit" />
      </div>
    </form>
  </div>
</template>
