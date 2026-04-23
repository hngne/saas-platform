<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShoppingBag,
  User,
} from "lucide-vue-next";
import { getApiErrorMessage } from "@/api/customer";
import { getStoreDisplayName } from "@/utils/storefront-brand";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";

const route = useRoute();
const router = useRouter();
const auth = useCustomerAuthStore();

const form = ref({
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  accepted: false,
});
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const errorMessage = ref("");
const displayStoreName = computed(getStoreDisplayName);

const onSubmit = async () => {
  errorMessage.value = "";

  if (form.value.password !== form.value.confirmPassword) {
    errorMessage.value = "Mật khẩu xác nhận không khớp.";
    return;
  }

  if (!form.value.accepted) {
    errorMessage.value = "Bạn cần đồng ý điều khoản trước khi đăng ký.";
    return;
  }

  try {
    await auth.register({
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      phone: form.value.phone.trim() || undefined,
      password: form.value.password,
    });
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/account";
    await router.push(redirect);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Đăng ký không thành công.");
  }
};
</script>

<template>
  <section class="register-page">
    <aside class="register-brand-panel" aria-hidden="true">
      <div class="register-brand-panel__pattern"></div>
      <div class="register-brand-panel__content">
        <div class="brand-mark">
          <span class="brand-mark__icon">
            <ShoppingBag :size="28" />
          </span>
          <div class="brand-mark__text">
            <strong>{{ displayStoreName }}</strong>
            <span>Join the storefront</span>
          </div>
        </div>

        <div class="brand-story">
          <h2>Tạo tài khoản để mua sắm nhanh hơn.</h2>
          <p>Lưu địa chỉ nhận hàng, xem lại đơn đã mua và theo dõi trạng thái giao hàng trong một nơi.</p>
        </div>

        <div class="brand-benefits">
          <article>
            <strong>Quản lý đơn hàng</strong>
            <span>Theo dõi trạng thái đơn hàng và lịch sử mua sắm.</span>
          </article>
          <article>
            <strong>Lưu thông tin nhanh</strong>
            <span>Tự động điền địa chỉ và liên hệ khi thanh toán.</span>
          </article>
        </div>
      </div>
    </aside>

    <main class="register-panel">
      <RouterLink to="/" class="back-home">
        <ArrowLeft :size="18" />
        Về trang chủ shop
      </RouterLink>

      <section class="register-card" aria-labelledby="register-title">
        <div class="register-card__header">
          <div class="register-card__badge">Tài khoản mới</div>
          <h1 id="register-title">Tạo tài khoản</h1>
          <p>Hoàn tất thông tin bên dưới để bắt đầu trải nghiệm mua sắm tại {{ displayStoreName }}.</p>
        </div>

        <form class="register-form" @submit.prevent="onSubmit">
          <label class="field field--simple">
            <span class="field__label">Họ và tên</span>
            <div class="field__control">
              <User :size="20" />
              <input v-model="form.name" placeholder="Nhập họ và tên của bạn" autocomplete="name" required />
            </div>
          </label>

          <label class="field field--simple">
            <span class="field__label">Email</span>
            <div class="field__control">
              <Mail :size="20" />
              <input v-model="form.email" type="email" placeholder="email@example.com" autocomplete="email" required />
            </div>
          </label>

          <label class="field field--simple">
            <span class="field__label">Số điện thoại</span>
            <div class="field__control">
              <Phone :size="20" />
              <input v-model="form.phone" placeholder="Nhập số điện thoại" autocomplete="tel" />
            </div>
          </label>

          <div class="password-grid">
            <label class="field">
              <span class="field__label">Mật khẩu</span>
              <div class="field__control">
                <Lock :size="20" />
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Tạo mật khẩu"
                  autocomplete="new-password"
                  required
                  minlength="6"
                />
                <button type="button" class="field__toggle" aria-label="Ẩn hiện mật khẩu" @click="showPassword = !showPassword">
                  <EyeOff v-if="showPassword" :size="20" />
                  <Eye v-else :size="20" />
                </button>
              </div>
            </label>

            <label class="field">
              <span class="field__label">Nhập lại mật khẩu</span>
              <div class="field__control">
                <Lock :size="20" />
                <input
                  v-model="form.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="Xác nhận mật khẩu"
                  autocomplete="new-password"
                  required
                  minlength="6"
                />
                <button type="button" class="field__toggle" aria-label="Ẩn hiện mật khẩu" @click="showConfirmPassword = !showConfirmPassword">
                  <EyeOff v-if="showConfirmPassword" :size="20" />
                  <Eye v-else :size="20" />
                </button>
              </div>
            </label>
          </div>

          <label class="terms-row">
            <input v-model="form.accepted" type="checkbox" />
            <span>Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật của cửa hàng.</span>
          </label>

          <small v-if="errorMessage" class="form-error">{{ errorMessage }}</small>

          <button type="submit" class="register-submit" :disabled="auth.loading">
            {{ auth.loading ? "Đang đăng ký..." : "Đăng ký ngay" }}
          </button>
        </form>

        <div class="login-link">
          Đã có tài khoản?
          <RouterLink to="/login">Đăng nhập</RouterLink>
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(540px, 1.1fr);
  background: #f7f7fb;
  color: #0f172a;
}

.register-brand-panel {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #ff8426 0%, #ffb31f 58%, #ffd44c 100%);
  color: #fff;
}

.register-brand-panel__pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.14) 1.3px, transparent 1.3px);
  background-size: 30px 30px;
}

.register-brand-panel__content {
  position: relative;
  min-height: 100vh;
  padding: 56px clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 36px;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-mark__icon {
  width: 80px;
  height: 80px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  color: #a33b00;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.brand-mark__text {
  display: grid;
  gap: 4px;
}

.brand-mark__text strong {
  font-size: clamp(28px, 3.8vw, 42px);
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}

.brand-mark__text span {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.78);
}

.brand-story h2 {
  margin: 0;
  max-width: 520px;
  font-size: clamp(44px, 6vw, 68px);
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.06em;
}

.brand-story p {
  max-width: 500px;
  margin: 18px 0 0;
  font-size: 18px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.92);
}

.brand-benefits {
  display: grid;
  gap: 16px;
  max-width: 480px;
}

.brand-benefits article {
  padding: 20px 22px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(12px);
}

.brand-benefits strong,
.brand-benefits span {
  display: block;
}

.brand-benefits strong {
  font-size: 17px;
}

.brand-benefits span {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.6;
}

.register-panel {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 52px 28px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.95), rgba(248, 249, 255, 1) 48%),
    #f7f7fb;
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

.register-card {
  width: min(620px, 100%);
}

.register-card__badge {
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

.register-card h1 {
  margin: 18px 0 0;
  font-size: clamp(38px, 4.2vw, 54px);
  line-height: 1.02;
  letter-spacing: -0.05em;
}

.register-card p {
  margin: 14px 0 0;
  color: #5b6474;
  font-size: 18px;
  line-height: 1.65;
}

.register-form {
  display: grid;
  gap: 20px;
  margin-top: 34px;
}

.password-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
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
  min-height: 66px;
  padding: 0 18px;
  border-radius: 18px;
  background: #eef1fb;
  border: 1px solid transparent;
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
  font-size: 17px;
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
  padding: 0;
  cursor: pointer;
}

.field--simple .field__control {
  grid-template-columns: 24px 1fr;
}

.terms-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #667085;
  font-size: 15px;
  line-height: 1.6;
}

.terms-row input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: #eb6a18;
}

.form-error {
  color: #dc2626;
  font-size: 14px;
  font-weight: 800;
}

.register-submit {
  height: 70px;
  border: none;
  border-radius: 18px;
  background: linear-gradient(90deg, #ff7127 0%, #ffcb0d 100%);
  color: #fff;
  font-size: 18px;
  font-weight: 900;
  box-shadow: 0 18px 28px rgba(255, 144, 32, 0.24);
}

.register-submit:disabled {
  opacity: 0.72;
  cursor: wait;
}

.login-link {
  margin-top: 28px;
  text-align: center;
  color: #5b6474;
  font-size: 16px;
}

.login-link a {
  color: #bf3f0b;
  font-weight: 800;
}

@media (max-width: 980px) {
  .register-page {
    grid-template-columns: 1fr;
  }

  .register-brand-panel {
    display: none;
  }

  .register-panel {
    padding: 84px 24px 32px;
  }

  .back-home {
    left: 24px;
  }
}

@media (max-width: 680px) {
  .register-panel {
    padding: 78px 18px 28px;
  }

  .back-home {
    left: 18px;
  }

  .register-card h1 {
    font-size: 34px;
  }

  .register-card p {
    font-size: 16px;
  }

  .password-grid {
    grid-template-columns: 1fr;
  }

  .field__control {
    min-height: 60px;
    border-radius: 16px;
    padding: 0 16px;
  }

  .field__control input {
    font-size: 16px;
  }

  .register-submit {
    height: 64px;
    border-radius: 16px;
  }
}
</style>
