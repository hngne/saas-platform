<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "primevue/usetoast";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Button from "primevue/button";

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

const email = ref("");
const password = ref("");
const loading = ref(false);

const handleLogin = async () => {
  if (!email.value || !password.value) {
    toast.add({
      severity: "warn",
      summary: "Thiếu thông tin",
      detail: "Vui lòng nhập email và mật khẩu",
      life: 3000,
    });
    return;
  }

  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    toast.add({
      severity: "success",
      summary: "Đăng nhập thành công",
      detail: "Chào mừng bạn trở lại!",
      life: 2000,
    });
    router.push("/dashboard");
  } catch (err: any) {
    const msg =
      err.response?.data?.message || "Email hoặc mật khẩu không đúng";
    toast.add({
      severity: "error",
      summary: "Đăng nhập thất bại",
      detail: msg,
      life: 4000,
    });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Header -->
      <div class="login-header">
        <div class="login-icon">
          <i class="pi pi-sparkles" style="font-size: 1.5rem"></i>
        </div>
        <h1 class="login-title">SuperAdmin</h1>
        <p class="login-subtitle">Hệ thống quản trị tối cao</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="field">
          <label for="email">Email Đăng Nhập</label>
          <InputText
            id="email"
            v-model="email"
            type="email"
            placeholder="admin@retail.vn"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="field">
          <label for="password">Mật khẩu</label>
          <!-- Password wrapper để fix full-width -->
          <div class="password-wrapper">
            <Password
              id="password"
              v-model="password"
              placeholder="••••••••"
              :feedback="false"
              toggleMask
              :disabled="loading"
              inputClass="w-full"
              class="w-full"
            />
          </div>
        </div>

        <Button
          type="submit"
          label="ĐĂNG NHẬP HỆ THỐNG"
          icon="pi pi-arrow-right"
          iconPos="right"
          class="submit-btn w-full"
          :loading="loading"
        />

        <div class="help-link">
          Gặp sự cố? <a href="#">Liên hệ IT Support</a>
        </div>
      </form>
    </div>

    <!-- Footer -->
    <div class="security-footer">
      <i class="pi pi-lock"></i> SECURE SSL ENCRYPTION
    </div>
  </div>
</template>

<style scoped>
/* ===== Page ===== */
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f1f5f9;
  padding: 1rem;
}

/* ===== Card ===== */
.login-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 16px;
  padding: 2.5rem 2.5rem;
  box-shadow:
    0 4px 24px -4px rgba(0, 0, 0, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
}

/* ===== Header ===== */
.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 1rem;
  border-radius: 14px;
  background-color: #4f46e5;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.3rem;
  letter-spacing: -0.3px;
}

.login-subtitle {
  font-size: 0.82rem;
  color: #6b7280;
}

/* ===== Form ===== */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
}

/* Fix PrimeVue InputText style */
.field :deep(.p-inputtext) {
  width: 100%;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.65rem 0.875rem;
  font-size: 0.9rem;
  color: #111827;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field :deep(.p-inputtext:focus) {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
  outline: none;
}

.field :deep(.p-inputtext::placeholder) {
  color: #9ca3af;
}

/* Fix PrimeVue Password full-width */
.password-wrapper {
  width: 100%;
}

.password-wrapper :deep(.p-password) {
  width: 100%;
}

.password-wrapper :deep(.p-password-input) {
  width: 100%;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.65rem 0.875rem;
  font-size: 0.9rem;
  color: #111827;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.password-wrapper :deep(.p-password-input:focus) {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
  outline: none;
}

.password-wrapper :deep(.p-password-input::placeholder) {
  color: #9ca3af;
}

/* Toggle mask icon */
.password-wrapper :deep(.p-password-toggle-mask-icon) {
  color: #9ca3af;
}

/* ===== Submit Button ===== */
.submit-btn {
  background-color: #4f46e5 !important;
  border-color: #4f46e5 !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  font-size: 0.85rem !important;
  letter-spacing: 0.5px;
  padding: 0.8rem 1rem !important;
  border-radius: 8px !important;
  margin-top: 0.25rem;
  transition: background-color 0.2s, transform 0.1s !important;
}

.submit-btn:hover:not(:disabled) {
  background-color: #4338ca !important;
  border-color: #4338ca !important;
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.99);
}

/* ===== Help Link ===== */
.help-link {
  text-align: center;
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.help-link a {
  color: #4f46e5;
  font-weight: 600;
  text-decoration: none;
}

.help-link a:hover {
  text-decoration: underline;
}

/* ===== Security Footer ===== */
.security-footer {
  margin-top: 2rem;
  font-size: 0.68rem;
  color: #9ca3af;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* ===== Responsive ===== */
@media (max-width: 480px) {
  .login-card {
    padding: 2rem 1.5rem;
    border-radius: 12px;
  }

  .login-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }

  .login-title {
    font-size: 1.2rem;
  }
}
</style>