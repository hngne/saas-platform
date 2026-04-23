<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowLeft, Mail, RefreshCcw, ShoppingBag } from "lucide-vue-next";
import { getStoreDisplayName } from "@/utils/storefront-brand";
import { useUiStore } from "@/stores/ui.store";

const email = ref("");
const submitted = ref(false);
const ui = useUiStore();
const displayStoreName = computed(getStoreDisplayName);

const onSubmit = async () => {
  submitted.value = true;
  ui.showToast("Luồng đặt lại mật khẩu đang được cập nhật. Vui lòng liên hệ cửa hàng để được hỗ trợ nhanh.");
};
</script>

<template>
  <section class="forgot-page">
    <aside class="forgot-brand-panel" aria-hidden="true">
      <div class="forgot-brand-panel__pattern"></div>
      <div class="forgot-brand-panel__content">
        <div class="forgot-brand">
          <span class="forgot-brand__icon">
            <ShoppingBag :size="28" />
          </span>
          <strong>{{ displayStoreName }}</strong>
        </div>

        <div class="forgot-brand-copy">
          <h2>Khôi phục quyền truy cập tài khoản.</h2>
          <p>Nhập email bạn đã dùng để đăng ký, chúng tôi sẽ hướng dẫn bước tiếp theo khi luồng reset hoàn tất.</p>
        </div>
      </div>
    </aside>

    <main class="forgot-panel">
      <RouterLink to="/login" class="back-link">
        <ArrowLeft :size="18" />
        Quay lại đăng nhập
      </RouterLink>

      <section class="forgot-card">
        <div class="forgot-badge">Khôi phục mật khẩu</div>
        <h1>Quên mật khẩu?</h1>
        <p>Nhập email tài khoản khách hàng của bạn để nhận hướng dẫn lấy lại mật khẩu.</p>

        <form class="forgot-form" @submit.prevent="onSubmit">
          <label class="field">
            <span class="field__label">Email đăng ký</span>
            <div class="field__control">
              <Mail :size="20" />
              <input v-model="email" type="email" required placeholder="email@example.com" autocomplete="email" />
            </div>
          </label>

          <button type="submit" class="submit-btn">
            <RefreshCcw :size="18" />
            Gửi yêu cầu hỗ trợ
          </button>
        </form>

        <div v-if="submitted" class="support-note">
          Chúng tôi đã ghi nhận yêu cầu của bạn trên giao diện. Hiện luồng reset tự động chưa bật, vui lòng liên hệ cửa hàng để được hỗ trợ nhanh nhất.
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
.forgot-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(320px, 0.88fr) minmax(520px, 1.12fr);
  background: #f7f7fb;
}

.forgot-brand-panel {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #ff8426 0%, #ffb31f 58%, #ffd44c 100%);
  color: #fff;
}

.forgot-brand-panel__pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.14) 1.3px, transparent 1.3px);
  background-size: 30px 30px;
}

.forgot-brand-panel__content {
  position: relative;
  min-height: 100vh;
  padding: 56px clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 28px;
}

.forgot-brand {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 900;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}

.forgot-brand__icon {
  width: 78px;
  height: 78px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  color: #a33b00;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.forgot-brand-copy h2 {
  margin: 0;
  max-width: 480px;
  font-size: clamp(42px, 6vw, 62px);
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.06em;
}

.forgot-brand-copy p {
  max-width: 460px;
  margin: 16px 0 0;
  font-size: 18px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.92);
}

.forgot-panel {
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

.back-link {
  position: absolute;
  top: 28px;
  left: 28px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #c24d0f;
  font-weight: 800;
}

.forgot-card {
  width: min(520px, 100%);
}

.forgot-badge {
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

.forgot-card h1 {
  margin: 18px 0 0;
  font-size: clamp(38px, 4.4vw, 52px);
  line-height: 1.04;
  letter-spacing: -0.05em;
}

.forgot-card p {
  margin: 14px 0 0;
  color: #5b6474;
  font-size: 18px;
  line-height: 1.65;
}

.forgot-form {
  display: grid;
  gap: 20px;
  margin-top: 34px;
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
  grid-template-columns: 24px 1fr;
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

.submit-btn {
  height: 70px;
  border: none;
  border-radius: 18px;
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

.support-note {
  margin-top: 22px;
  padding: 16px 18px;
  border-radius: 18px;
  background: #fff7ed;
  color: #9a3412;
  line-height: 1.6;
}

@media (max-width: 980px) {
  .forgot-page {
    grid-template-columns: 1fr;
  }

  .forgot-brand-panel {
    display: none;
  }

  .forgot-panel {
    padding: 84px 24px 32px;
  }

  .back-link {
    left: 24px;
  }
}

@media (max-width: 640px) {
  .forgot-panel {
    padding: 78px 18px 28px;
  }

  .back-link {
    left: 18px;
  }

  .forgot-card h1 {
    font-size: 34px;
  }

  .forgot-card p {
    font-size: 16px;
  }

  .field__control {
    min-height: 60px;
    border-radius: 16px;
    padding: 0 16px;
  }

  .submit-btn {
    height: 64px;
    border-radius: 16px;
  }
}
</style>
