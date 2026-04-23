<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Facebook,
  Lock,
  Mail,
  ShoppingBag,
} from "lucide-vue-next";
import { getApiErrorMessage } from "@/api/customer";
import { getStoreDisplayName } from "@/utils/storefront-brand";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";

const route = useRoute();
const router = useRouter();
const auth = useCustomerAuthStore();

const email = ref("");
const password = ref("");
const remember = ref(true);
const showPassword = ref(false);
const errorMessage = ref("");
const displayStoreName = computed(getStoreDisplayName);
const quoteAuthor = computed(() => `${displayStoreName.value} Team`);

const onSubmit = async () => {
  errorMessage.value = "";

  try {
    await auth.login({ email: email.value.trim(), password: password.value });
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/account";
    await router.push(redirect);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Thông tin đăng nhập không chính xác.");
  }
};
</script>

<template>
  <section class="login-page">
    <aside class="brand-panel" aria-hidden="true">
      <div class="brand-panel__pattern"></div>
      <div class="brand-panel__content">
        <div class="brand-mark">
          <span class="brand-mark__icon">
            <ShoppingBag :size="28" />
          </span>
          <div class="brand-mark__text">
            <strong>{{ displayStoreName }}</strong>
            <span>Customer Storefront</span>
          </div>
        </div>

        <div class="brand-story">
          <h2>{{ displayStoreName }}</h2>
          <p>Không gian mua sắm trực tuyến đồng bộ đơn hàng, tài khoản và trải nghiệm khách hàng.</p>
        </div>

        <article class="brand-quote">
          <div class="brand-quote__avatar">{{ displayStoreName.charAt(0) }}</div>
          <div>
            <strong>"Đăng nhập một lần để theo dõi đơn hàng và mua sắm nhanh hơn."</strong>
            <span>{{ quoteAuthor }}</span>
          </div>
        </article>
      </div>
    </aside>

    <main class="login-panel">
      <RouterLink to="/" class="back-home">
        <ArrowLeft :size="18" />
        Về trang chủ shop
      </RouterLink>

      <section class="login-card" aria-labelledby="login-title">
        <div class="login-card__header">
          <div class="login-card__badge">Tài khoản khách hàng</div>
          <h1 id="login-title">Chào mừng trở lại!</h1>
          <p>Vui lòng đăng nhập để tiếp tục mua sắm, quản lý đơn hàng và theo dõi thông tin tài khoản.</p>
        </div>

        <form class="login-form" @submit.prevent="onSubmit">
          <label class="field">
            <span class="field__label">Địa chỉ email</span>
            <div class="field__control">
              <Mail :size="20" />
              <input v-model="email" type="email" autocomplete="email" required placeholder="email@example.com" />
            </div>
          </label>

          <label class="field">
            <span class="field__label">Mật khẩu</span>
            <div class="field__control">
              <Lock :size="20" />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                minlength="6"
                placeholder="Nhập mật khẩu"
              />
              <button type="button" class="field__toggle" aria-label="Ẩn hiện mật khẩu" @click="showPassword = !showPassword">
                <EyeOff v-if="showPassword" :size="20" />
                <Eye v-else :size="20" />
              </button>
            </div>
            <small v-if="errorMessage" class="error">{{ errorMessage }}</small>
          </label>

          <div class="form-meta">
            <label class="remember-row">
              <input v-model="remember" type="checkbox" />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <RouterLink to="/forgot-password" class="forgot-link">Quên mật khẩu?</RouterLink>
          </div>

          <button type="submit" class="login-submit" :disabled="auth.loading">
            <span>{{ auth.loading ? "Đang đăng nhập..." : "Đăng nhập" }}</span>
            <span class="login-submit__arrow">→</span>
          </button>
        </form>

        <div class="social-divider">
          <span>Hoặc tiếp tục với</span>
        </div>

        <div class="social-grid">
          <button type="button" class="social-button">
            <span class="social-button__icon social-button__icon--google">G</span>
            Google
          </button>
          <button type="button" class="social-button">
            <Facebook :size="18" />
            Facebook
          </button>
        </div>

        <div class="login-switch">
          Chưa có tài khoản?
          <RouterLink to="/register">Đăng ký ngay</RouterLink>
        </div>

        <footer class="login-footer">{{ displayStoreName.toLowerCase() }}.customer.localhost</footer>
      </section>
    </main>
  </section>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(360px, 0.92fr) minmax(520px, 1.08fr);
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.95), rgba(248, 249, 255, 1) 48%),
    #f7f7fb;
  color: #0f172a;
}

.brand-panel {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #ff7a21 0%, #ffb11f 55%, #ffd54a 100%);
  color: #fff;
}

.brand-panel__pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.14) 1.3px, transparent 1.3px);
  background-size: 30px 30px;
  opacity: 0.9;
}

.brand-panel__content {
  position: relative;
  min-height: 100vh;
  padding: 56px clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 42px;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-mark__icon {
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

.brand-mark__text {
  display: grid;
  gap: 4px;
}

.brand-mark__text strong {
  font-size: clamp(30px, 4vw, 44px);
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}

.brand-mark__text span {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.78);
}

.brand-story {
  max-width: 520px;
}

.brand-story h2 {
  margin: 0;
  font-size: clamp(48px, 7vw, 76px);
  line-height: 0.98;
  font-weight: 900;
  letter-spacing: -0.06em;
  text-transform: uppercase;
}

.brand-story p {
  margin: 18px 0 0;
  font-size: 19px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.92);
}

.brand-quote {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 16px;
  max-width: 480px;
  padding: 26px 28px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(14px);
}

.brand-quote__avatar {
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

.brand-quote strong,
.brand-quote span {
  display: block;
}

.brand-quote strong {
  font-size: 18px;
  line-height: 1.5;
}

.brand-quote span {
  margin-top: 8px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.82);
}

.login-panel {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 52px 28px;
}

.back-home {
  position: absolute;
  top: 28px;
  left: 28px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #c24d0f;
  font-weight: 800;
}

.login-card {
  width: min(528px, 100%);
  padding: 30px 0 0;
}

.login-card__header {
  margin-bottom: 34px;
}

.login-card__badge {
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

.login-card h1 {
  margin: 18px 0 0;
  font-size: clamp(40px, 4.5vw, 58px);
  line-height: 1.02;
  letter-spacing: -0.05em;
}

.login-card p {
  margin: 14px 0 0;
  color: #5b6474;
  font-size: 18px;
  line-height: 1.65;
}

.login-form {
  display: grid;
  gap: 22px;
}

.field {
  display: grid;
  gap: 10px;
}

.field__label {
  color: #3b2a24;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.field__control {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  align-items: center;
  gap: 14px;
  min-height: 70px;
  padding: 0 20px;
  border-radius: 18px;
  background: #eef1fb;
  border: 1px solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field__control:focus-within {
  border-color: rgba(220, 106, 22, 0.38);
  box-shadow: 0 0 0 4px rgba(255, 136, 43, 0.08);
}

.field__control svg {
  color: #8b6d5f;
}

.field__control input {
  width: 100%;
  border: none;
  background: transparent;
  color: #1f2937;
  font-size: 18px;
  outline: none;
}

.field__control input::placeholder {
  color: #9aa4b5;
}

.field__toggle {
  border: none;
  background: transparent;
  color: #8b6d5f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.field:first-child .field__control {
  grid-template-columns: 24px 1fr;
}

.error {
  color: #dc2626;
  font-size: 14px;
  font-weight: 700;
}

.form-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: -2px;
}

.remember-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #667085;
  font-size: 15px;
  font-weight: 600;
}

.remember-row input {
  width: 18px;
  height: 18px;
  accent-color: #eb6a18;
}

.forgot-link,
.login-switch a {
  color: #bf3f0b;
  font-weight: 800;
}

.login-submit {
  height: 74px;
  border: none;
  border-radius: 18px;
  margin-top: 10px;
  background: linear-gradient(90deg, #ff7127 0%, #ffcb0d 100%);
  color: #fff;
  font-size: 18px;
  font-weight: 900;
  box-shadow: 0 18px 28px rgba(255, 144, 32, 0.24);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.login-submit:disabled {
  opacity: 0.72;
  cursor: wait;
}

.login-submit__arrow {
  font-size: 28px;
  line-height: 1;
}

.social-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 34px 0 22px;
  color: #8b6d5f;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.social-divider::before,
.social-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: #d9dfeb;
}

.social-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.social-button {
  min-height: 56px;
  border: 1px solid #d7deea;
  border-radius: 16px;
  background: #fff;
  color: #0f172a;
  font-size: 16px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.social-button__icon {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 900;
}

.social-button__icon--google {
  background: #fff1eb;
  color: #ea4335;
}

.login-switch {
  margin: 32px 0 0;
  text-align: center;
  color: #5b6474;
  font-size: 16px;
}

.login-footer {
  margin-top: 34px;
  padding-top: 26px;
  border-top: 1px solid #e4e7f0;
  text-align: center;
  color: #b4a39b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

@media (max-width: 980px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    display: none;
  }

  .login-panel {
    padding: 84px 24px 32px;
  }

  .back-home {
    left: 24px;
  }

  .login-card {
    padding-top: 0;
  }
}

@media (max-width: 640px) {
  .login-panel {
    padding: 78px 18px 28px;
  }

  .back-home {
    left: 18px;
  }

  .login-card h1 {
    font-size: 36px;
  }

  .login-card p {
    font-size: 16px;
  }

  .field__control {
    min-height: 62px;
    border-radius: 16px;
    padding: 0 16px;
  }

  .field__control input {
    font-size: 16px;
  }

  .form-meta,
  .social-grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .form-meta {
    gap: 12px;
  }

  .login-submit {
    height: 66px;
    border-radius: 16px;
  }
}
</style>
