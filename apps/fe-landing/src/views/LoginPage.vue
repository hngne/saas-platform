<template>
  <AuthLayout
    title="Đăng nhập cửa hàng"
    subtitle="Quản lý cửa hàng thông minh — Bán hàng không giới hạn"
    feature1Title="Tốc độ xử lý chớp nhoáng"
    feature1Desc="Hệ thống ổn định 99.9%, sẵn sàng đồng hành cùng sự phát triển của bạn."
  >
    <div class="w-full">
      <!-- Back to Home -->
      <router-link to="/" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8">
        <ArrowLeftIcon class="w-4 h-4" />
        <span class="font-medium text-sm">Về trang chủ</span>
      </router-link>

      <h2 class="text-3xl font-bold tracking-tight text-gray-900 mb-2">Đăng nhập cửa hàng</h2>
      <p class="text-gray-500 mb-6">Nhập email và mật khẩu để tiếp tục</p>

      <form @submit.prevent="onSubmit" class="space-y-4">
        <!-- Email -->
        <BaseInput
          v-model="form.email"
          label="Email"
          type="email"
          placeholder="email@cuahang.com"
          :error="errors.email"
        >
          <template #icon>
            <MailIcon class="h-5 w-5" />
          </template>
        </BaseInput>

        <!-- Password -->
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

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input id="remember-me" name="remember-me" type="checkbox" class="h-4 w-4 text-[#FF6B2B] focus:ring-[#FF6B2B] border-gray-300 rounded" />
            <label for="remember-me" class="ml-2 block text-sm text-gray-900">
              Ghi nhớ đăng nhập
            </label>
          </div>

          <div class="text-sm">
            <a href="#" class="font-medium text-[#FF6B2B] hover:text-[#e05a22]">
              Quên mật khẩu?
            </a>
          </div>
        </div>

        <div class="mt-4" v-if="globalError">
          <p class="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{{ globalError }}</p>
        </div>

        <BaseButton type="submit" fullWidth :loading="isLoading" size="lg">
          Đăng nhập ngay
        </BaseButton>
      </form>

      <div class="mt-8 text-center text-sm text-gray-600">
        Chưa có cửa hàng?
        <router-link to="/register" class="font-medium text-[#FF6B2B] hover:text-[#e05a22] transition-colors">
          Tạo ngay miễn phí
        </router-link>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { MailIcon, LockIcon, ArrowLeftIcon } from 'lucide-vue-next'
import { z } from 'zod'
import Cookies from 'js-cookie'
import AuthLayout from '../layouts/AuthLayout.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import api from '../utils/api'

const isLoading = ref(false)
const globalError = ref('')

const form = reactive({
  email: '',
  password: ''
})

const errors = reactive({
  email: '',
  password: ''
})

const schema = z.object({
  email: z.string().min(1, 'Email không được để trống').email('Vui lòng nhập định dạng email hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
})

const validate = () => {
  errors.email = ''
  errors.password = ''
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
    const response = await api.post('/merchant/auth/login-global', {
      email: form.email,
      password: form.password
    })
    
    // Lưu accessToken vào cookie domain localhost
    Cookies.set('accessToken', response.data.data.accessToken, { 
      domain: 'localhost',
      path: '/'
    })
    
    // Redirect sang subdomain
    const slug = response.data.data.tenant.slug
    window.location.href = `http://${slug}.localhost:3002/dashboard`
    
  } catch (error: any) {
    globalError.value = error.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.'
  } finally {
    isLoading.value = false
  }
}
</script>
