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
  <div class="merchant-login-page">
    <aside class="merchant-brand-panel" aria-hidden="true">
      <div class="merchant-brand-panel__pattern"></div>
      <div class="merchant-brand-panel__content">
        <div class="merchant-brand-mark">
          <div class="merchant-brand-icon">
            <i class="pi pi-shopping-bag"></i>
          </div>
          <div>
            <strong>ShopFlow</strong>
            <span>Merchant CMS</span>
          </div>
        </div>

        <div class="merchant-brand-copy">
          <h1>Quản lý cửa hàng trong một màn hình đăng nhập gọn gàng hơn.</h1>
          <p>Đăng nhập để tiếp tục theo dõi đơn hàng, sản phẩm, khách hàng và vận hành cửa hàng của bạn.</p>
        </div>

        <article class="merchant-brand-quote">
          <div class="merchant-brand-quote__avatar">S</div>
          <div>
            <strong>"Tối ưu vận hành chỉ trong vài phút cấu hình."</strong>
            <span>ShopFlow Merchant Platform</span>
          </div>
        </article>
      </div>
    </aside>

    <main class="merchant-login-panel">
      <section class="merchant-login-card fade-in-up">
        <div class="merchant-login-header">
          <div class="merchant-login-badge">Merchant login</div>
          <h2>Chào mừng trở lại!</h2>
          <p>Vui lòng đăng nhập để tiếp tục quản lý hệ thống.</p>
        </div>

        <form @submit.prevent="handleLogin" class="merchant-login-form">
          <div class="field">
            <label for="email">Địa chỉ email</label>
            <span class="field-shell">
              <i class="pi pi-envelope"></i>
              <InputText
                id="email"
                v-model="email"
                placeholder="merchant@email.com"
                class="w-full"
                :disabled="loading"
              />
            </span>
          </div>

          <div class="field">
            <div class="field-topline">
              <label for="password">Mật khẩu</label>
              <a href="#" @click.prevent>Quên mật khẩu?</a>
            </div>
            <span class="field-shell">
              <i class="pi pi-lock"></i>
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
            </span>
          </div>

          <Button
            type="submit"
            label="Đăng nhập"
            icon="pi pi-arrow-right"
            iconPos="right"
            class="merchant-submit w-full"
            :loading="loading"
          />
        </form>

        <footer class="merchant-login-footer">shopflow-admin.localhost:3002</footer>
      </section>
    </main>
  </div>
</template>

<style scoped>
.merchant-login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(360px, 0.86fr) minmax(560px, 1.14fr);
  background: #f7f7fb;
}

.merchant-brand-panel {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #ff8426 0%, #ffb31f 58%, #ffd44c 100%);
  color: #fff;
}

.merchant-brand-panel__pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.14) 1.3px, transparent 1.3px);
  background-size: 30px 30px;
}

.merchant-brand-panel__content {
  position: relative;
  min-height: 100vh;
  padding: 56px clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 40px;
}

.merchant-brand-mark {
  display: flex;
  align-items: center;
  gap: 16px;
}

.merchant-brand-icon {
  width: 82px;
  height: 82px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  color: #a33b00;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 18px 34px rgba(138, 57, 0, 0.18);
}

.merchant-brand-icon i {
  font-size: 1.8rem;
}

.merchant-brand-mark strong,
.merchant-brand-mark span {
  display: block;
}

.merchant-brand-mark strong {
  font-size: clamp(32px, 4vw, 46px);
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}

.merchant-brand-mark span {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.78);
}

.merchant-brand-copy h1 {
  margin: 0;
  max-width: 540px;
  font-size: clamp(42px, 6vw, 66px);
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.06em;
}

.merchant-brand-copy p {
  max-width: 500px;
  margin: 18px 0 0;
  font-size: 18px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.9);
}

.merchant-brand-quote {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 16px;
  max-width: 480px;
  padding: 24px 26px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(14px);
}

.merchant-brand-quote__avatar {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  color: #b34700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}

.merchant-brand-quote strong,
.merchant-brand-quote span {
  display: block;
}

.merchant-brand-quote strong {
  font-size: 18px;
  line-height: 1.5;
}

.merchant-brand-quote span {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.82);
}

.merchant-login-panel {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36px 28px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.95), rgba(248, 249, 255, 1) 48%),
    #f7f7fb;
}

.merchant-login-card {
  width: min(528px, 100%);
}

.merchant-login-header {
  margin-bottom: 30px;
}

.merchant-login-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #fff2e8;
  color: #d45a12;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.merchant-login-header h2 {
  margin: 18px 0 0;
  font-size: clamp(40px, 4.4vw, 56px);
  line-height: 1.02;
  letter-spacing: -0.05em;
  color: #0f172a;
}

.merchant-login-header p {
  margin: 14px 0 0;
  color: #5b6474;
  font-size: 18px;
  line-height: 1.65;
}

.merchant-login-form {
  display: grid;
  gap: 20px;
}

.field {
  display: grid;
  gap: 10px;
}

.field label {
  color: #3b2a24;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.field-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field-topline a {
  color: #bf3f0b;
  font-weight: 800;
  font-size: 14px;
  text-transform: none;
  letter-spacing: 0;
}

.field-shell {
  display: grid;
  grid-template-columns: 24px 1fr;
  align-items: center;
  gap: 14px;
  min-height: 68px;
  padding: 0 18px;
  border-radius: 18px;
  background: #eef1fb;
  border: 1px solid transparent;
}

.field-shell:focus-within {
  border-color: rgba(220, 106, 22, 0.38);
  box-shadow: 0 0 0 4px rgba(255, 136, 43, 0.08);
}

.field-shell > i {
  color: #8b6d5f;
}

.field-shell :deep(.p-inputtext),
.field-shell :deep(.p-password),
.field-shell :deep(.p-password-input) {
  width: 100%;
}

.field-shell :deep(.p-inputtext),
.field-shell :deep(.p-password-input) {
  border: none;
  background: transparent;
  box-shadow: none;
  padding: 0;
  color: #1f2937;
  font-size: 17px;
}

.field-shell :deep(.p-password) {
  display: flex;
  align-items: center;
}

.field-shell :deep(.p-password-toggle-mask-icon) {
  color: #8b6d5f;
}

.merchant-submit {
  height: 72px;
  margin-top: 8px;
  border: none !important;
  border-radius: 18px !important;
  background: linear-gradient(90deg, #ff7127 0%, #ffcb0d 100%) !important;
  box-shadow: 0 18px 28px rgba(255, 144, 32, 0.24);
  font-size: 18px !important;
  font-weight: 900 !important;
}

.merchant-login-footer {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e4e7f0;
  text-align: center;
  color: #b4a39b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

@media (max-width: 980px) {
  .merchant-login-page {
    grid-template-columns: 1fr;
  }

  .merchant-brand-panel {
    display: none;
  }

  .merchant-login-panel {
    padding: 48px 20px;
  }
}

@media (max-width: 640px) {
  .merchant-login-header h2 {
    font-size: 34px;
  }

  .merchant-login-header p {
    font-size: 16px;
  }

  .field-shell {
    min-height: 60px;
    padding: 0 16px;
    border-radius: 16px;
  }

  .merchant-submit {
    height: 64px;
    border-radius: 16px !important;
  }
}
</style>
