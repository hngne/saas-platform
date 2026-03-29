<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { promotionService, type CreatePromotionDto } from '@/services/promotion.service'
import { productService, type Product } from '@/services/product.service'
import { useAppToast } from '@/composables/useToast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import Select from 'primevue/select'

const route = useRoute()
const router = useRouter()
const toast = useAppToast()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const saving = ref(false)
const products = ref<Product[]>([])

const form = ref({
  name: '',
  description: '',
  start_date: null as Date | null,
  end_date: null as Date | null,
  is_active: true,
})

const details = ref<Array<{ product_id: string; discount_percent: number; product_name?: string }>>([])

const addDetail = () => {
  details.value.push({ product_id: '', discount_percent: 10 })
}

const removeDetail = (i: number) => {
  details.value.splice(i, 1)
}

const productOptions = computed(() =>
  products.value.map(p => ({ label: p.name, value: p.id }))
)

const fetchData = async () => {
  loading.value = true
  try {
    const { data: prodData } = await productService.getAll({ limit: 100 })
    products.value = prodData.data?.data || prodData.data?.items || prodData.data || []

    if (isEdit.value) {
      const { data } = await promotionService.getById(route.params.id as string)
      const p = data.data
      form.value = {
        name: p.name,
        description: p.description || '',
        start_date: p.start_date ? new Date(p.start_date) : null,
        end_date: p.end_date ? new Date(p.end_date) : null,
        is_active: p.is_active,
      }
      details.value = (p.details || []).map((d: any) => ({
        product_id: d.product_id,
        discount_percent: d.discount_percent,
        product_name: d.product_name,
      }))
    }
  } catch { toast.error('Không thể tải dữ liệu') }
  finally { loading.value = false }
}

const handleSubmit = async () => {
  if (!form.value.name.trim()) { toast.warn('Tên không được để trống'); return }

  saving.value = true
  try {
    if (isEdit.value) {
      await promotionService.update(route.params.id as string, {
        name: form.value.name,
        description: form.value.description || null,
        start_date: form.value.start_date?.toISOString() || null,
        end_date: form.value.end_date?.toISOString() || null,
        is_active: form.value.is_active,
      })
      toast.success('Cập nhật thành công')
    } else {
      const validDetails = details.value.filter(d => d.product_id && d.discount_percent > 0)
      if (validDetails.length === 0) { toast.warn('Phải có ít nhất 1 sản phẩm'); saving.value = false; return }
      const dto: CreatePromotionDto = {
        name: form.value.name,
        description: form.value.description || null,
        start_date: form.value.start_date?.toISOString() || null,
        end_date: form.value.end_date?.toISOString() || null,
        is_active: form.value.is_active,
        details: validDetails.map(d => ({ product_id: d.product_id, discount_percent: d.discount_percent })),
      }
      await promotionService.create(dto)
      toast.success('Tạo khuyến mãi thành công')
    }
    router.push('/promotions')
  } catch (err: any) { toast.error('Lỗi', err.response?.data?.message || 'Thất bại') }
  finally { saving.value = false }
}

onMounted(fetchData)
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
  </div>

  <div v-else class="max-w-3xl">
    <div class="flex items-center gap-3 mb-5">
      <Button icon="pi pi-arrow-left" text rounded @click="router.push('/promotions')" />
      <h2 class="text-lg font-bold" style="color: var(--text-primary)">{{ isEdit ? 'Sửa khuyến mãi' : 'Tạo khuyến mãi' }}</h2>
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="app-card p-5 mb-5 fade-in-up">
        <h3 class="text-sm font-bold mb-3">Thông tin</h3>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Tên *</label><InputText v-model="form.name" class="w-full" /></div>
          <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Mô tả</label><Textarea v-model="form.description" rows="2" class="w-full" /></div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Bắt đầu</label><DatePicker v-model="form.start_date" dateFormat="dd/mm/yy" showIcon class="w-full" /></div>
            <div class="flex flex-col gap-1"><label class="text-xs font-semibold">Kết thúc</label><DatePicker v-model="form.end_date" dateFormat="dd/mm/yy" showIcon class="w-full" /></div>
          </div>
          <div class="flex items-center gap-2"><ToggleSwitch v-model="form.is_active" /><span class="text-sm">Hoạt động</span></div>
        </div>
      </div>

      <!-- Products (create mode) -->
      <div v-if="!isEdit" class="app-card p-5 mb-5 fade-in-up">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold">Sản phẩm áp dụng</h3>
          <Button label="Thêm SP" icon="pi pi-plus" text size="small" @click="addDetail" />
        </div>
        <div v-for="(d, i) in details" :key="i" class="flex items-center gap-3 mb-2 p-3 rounded-lg" style="background: #F9FAFB">
          <Select v-model="d.product_id" :options="productOptions" optionLabel="label" optionValue="value" placeholder="Chọn sản phẩm" filter class="flex-1" />
          <div class="flex items-center gap-1">
            <InputNumber v-model="d.discount_percent" :min="1" :max="100" suffix="%" class="w-24" />
          </div>
          <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="removeDetail(i)" />
        </div>
        <p v-if="!details.length" class="text-sm text-center py-3" style="color: var(--text-muted)">Chưa có sản phẩm. Bấm "Thêm SP" để thêm.</p>
      </div>

      <!-- Edit mode: show existing details (read-only hint) -->
      <div v-if="isEdit && details.length" class="app-card p-5 mb-5 fade-in-up">
        <h3 class="text-sm font-bold mb-3">Sản phẩm đang áp dụng ({{ details.length }})</h3>
        <div v-for="d in details" :key="d.product_id" class="flex items-center justify-between py-2 border-b" style="border-color: var(--border)">
          <span class="text-sm">{{ d.product_name || d.product_id }}</span>
          <span class="font-semibold text-sm" style="color: var(--primary)">-{{ d.discount_percent }}%</span>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <Button label="Hủy" severity="secondary" text @click="router.push('/promotions')" />
        <Button :label="isEdit ? 'Cập nhật' : 'Tạo'" class="btn-gradient" :loading="saving" type="submit" />
      </div>
    </form>
  </div>
</template>
