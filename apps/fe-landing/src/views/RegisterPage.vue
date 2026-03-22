<template>
  <AuthLayout
    title="Tạo cửa hàng miễn phí"
    subtitle="Chỉ mất 30 giây để bắt đầu kinh doanh và quản lý thông minh"
    feature1Title="Tên miền phụ chuyên nghiệp"
    feature1Desc="Nhận ngay subdomain cuahangcuaban.shopflow.io hoàn toàn miễn phí."
  >
    <div class="w-full">
      <!-- Back to Home -->
      <router-link to="/" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4">
        <ArrowLeftIcon class="w-4 h-4" />
        <span class="font-medium text-sm">Về trang chủ</span>
      </router-link>

      <h2 class="text-2xl font-bold tracking-tight text-gray-900 mb-1">Đăng ký cửa hàng</h2>
      <p class="text-gray-500 text-sm mb-4">Hãy điền thông tin để tạo cửa hàng của bạn</p>

      <form @submit.prevent="onSubmit" class="space-y-3">
        <!-- Row 1: Store Name + Owner Name -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseInput
            v-model="form.store_name"
            label="Tên cửa hàng"
            type="text"
            placeholder="Cửa hàng của tôi"
            :error="errors.store_name"
          >
            <template #icon>
              <StoreIcon class="h-5 w-5" />
            </template>
          </BaseInput>

          <BaseInput
            v-model="form.owner_name"
            label="Tên chủ shop"
            type="text"
            placeholder="Nguyễn Văn A"
            :error="errors.owner_name"
          >
            <template #icon>
              <UserIcon class="h-5 w-5" />
            </template>
          </BaseInput>
        </div>

        <!-- Row 2: Email + Phone -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseInput
            v-model="form.email"
            label="Email"
            type="email"
            placeholder="email@example.com"
            :error="errors.email"
          >
            <template #icon>
              <MailIcon class="h-5 w-5" />
            </template>
          </BaseInput>

          <BaseInput
            v-model="form.phone"
            label="Số điện thoại"
            type="text"
            placeholder="0912345678"
            :error="errors.phone"
          >
            <template #icon>
              <PhoneIcon class="h-5 w-5" />
            </template>
          </BaseInput>
        </div>

        <!-- Row 3: Password + Business Type -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseInput
            v-model="form.password"
            label="Mật khẩu"
            type="password"
            placeholder="••••••••"
            :error="errors.password"
          >
            <template #icon>
              <LockIcon class="h-5 w-5" />
            </template>
          </BaseInput>

          <div class="w-full">
            <label class="block text-sm font-medium text-gray-700 mb-1">Ngành hàng</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <BriefcaseIcon class="h-5 w-5" />
              </div>
              <select
                v-model="form.business_type"
                class="block w-full rounded-xl pl-10 pr-4 py-3 bg-white border border-gray-300 outline-none focus:ring-1 focus:ring-[#FF6B2B] focus:border-[#FF6B2B] sm:text-sm transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="RETAIL">Bán lẻ (Retail)</option>
                <option value="HOTEL">Khách sạn (Hotel) - Sắp ra mắt</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Subdomain Preview -->
        <div v-if="form.store_name" class="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-100">
          <GlobeIcon class="w-3.5 h-3.5 text-orange-400" />
          <span class="text-xs text-orange-600 font-medium truncate">
            URL: {{ slugify(form.store_name) }}.shopflow.io
          </span>
        </div>

        <div v-if="globalError">
          <p class="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{{ globalError }}</p>
        </div>

        <BaseButton type="submit" fullWidth :loading="isLoading" size="lg">
          Bắt đầu kinh doanh ngay
        </BaseButton>
      </form>

      <div class="mt-4 text-center text-sm text-gray-600">
        Đã có cửa hàng?
        <router-link to="/login" class="font-medium text-[#FF6B2B] hover:text-[#e05a22] transition-colors">
          Đăng nhập ngay
        </router-link>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { StoreIcon, UserIcon, BriefcaseIcon, PhoneIcon, MailIcon, LockIcon, GlobeIcon, ArrowLeftIcon } from 'lucide-vue-next'
import { z } from 'zod'
import Cookies from 'js-cookie'
import AuthLayout from '../layouts/AuthLayout.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import api from '../utils/api'

const isLoading = ref(false)
const globalError = ref('')

const form = reactive({
  store_name: '',
  owner_name: '',
  business_type: 'RETAIL',
  phone: '',
  email: '',
  password: ''
})

const errors = reactive({
  store_name: '',
  owner_name: '',
  business_type: '',
  phone: '',
  email: '',
  password: ''
})

const schema = z.object({
  store_name: z.string().min(1, 'Tên cửa hàng không được để trống'),
  owner_name: z.string().min(1, 'Tên chủ shop không được để trống'),
  business_type: z.string(),
  phone: z.string().optional(),
  email: z.string().min(1, 'Email không được để trống').email('Vui lòng nhập định dạng email hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
})

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
}

const validate = () => {
  Object.keys(errors).forEach(key => (errors[key as keyof typeof errors] = ''))
  globalError.value = ''
  
  try {
    schema.parse(form)
    return true
  } catch (err) {
    if (err instanceof z.ZodError) {
      err.issues.forEach(issue => {
        const path = issue.path[0] as keyof typeof errors
        if (path) {
          errors[path] = issue.message
        }
      })
    }
    return false
  }
}

const onSubmit = async () => {
  if (!validate()) return

  isLoading.value = true
  try {
    const { phone, ...registerData } = form
    const payload = phone.trim() ? form : registerData

    const response = await api.post('/merchant/auth/register', payload)
    
    Cookies.set('accessToken', response.data.data.accessToken, { 
      domain: 'localhost',
      path: '/'
    })
    
    const slug = response.data.data.tenant.slug
    window.location.href = `http://${slug}.localhost:3001/dashboard`
    
  } catch (error: any) {
    globalError.value = error.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.'
  } finally {
    isLoading.value = false
  }
}
</script>
