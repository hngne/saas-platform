<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useAppToast } from '@/composables/useToast'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'

const router = useRouter()
const authStore = useAuthStore()
const toast = useAppToast()

const email = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!email.value || !password.value) {
    toast.warn('Vui lòng nhập đầy đủ thông tin')
    return
  }
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    toast.success('Đăng nhập thành công!')
    router.push('/dashboard')
  } catch (err: any) {
    const msg = err.response?.data?.message || 'Đăng nhập thất bại'
    toast.error('Lỗi', msg)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Decorative shapes -->
    <div class="deco deco-1"></div>
    <div class="deco deco-2"></div>

    <div class="login-card fade-in-up">
      <!-- Logo -->
      <div class="login-logo">
        <div class="logo-circle">
          <i class="pi pi-shopping-bag" style="font-size: 1.8rem; color: #fff"></i>
        </div>
        <h1 class="login-title">ShopFlow</h1>
        <p class="login-subtitle">Đăng nhập vào hệ thống quản lý cửa hàng</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="field">
          <label for="email">Email</label>
          <InputText
            id="email"
            v-model="email"
            placeholder="merchant@email.com"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="field">
          <label for="password">Mật khẩu</label>
          <Password
            id="password"
            v-model="password"
            placeholder="••••••••"
            :feedback="false"
            toggleMask
            class="w-full"
            inputClass="w-full"
            :disabled="loading"
          />
        </div>

        <Button
          type="submit"
          label="Đăng nhập"
          class="btn-gradient w-full mt-2"
          :loading="loading"
          style="height: 44px; border-radius: 10px; font-size: 0.95rem"
        />
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFF9F5 0%, #FFE8D6 50%, #FFF0E5 100%);
  position: relative;
  overflow: hidden;
}

.deco {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
}
.deco-1 {
  width: 400px; height: 400px;
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  top: -100px; right: -100px;
}
.deco-2 {
  width: 300px; height: 300px;
  background: linear-gradient(135deg, #FFD700, #FF6B2B);
  bottom: -80px; left: -80px;
}

.login-card {
  background: #fff;
  border-radius: 20px;
  padding: 48px 40px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(255, 107, 43, 0.1), 0 1px 3px rgba(0,0,0,0.05);
  position: relative;
  z-index: 1;
}

.login-logo {
  text-align: center;
  margin-bottom: 32px;
}

.logo-circle {
  width: 64px; height: 64px;
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 8px 24px rgba(255, 107, 43, 0.3);
}

.login-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.login-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 6px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
}
</style>
