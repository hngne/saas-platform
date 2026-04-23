<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ArrowLeft, Check, Lock, Save, ShieldCheck } from "lucide-vue-next";
import { getApiErrorMessage } from "@/api/customer";
import CustomerAccountSidebar from "@/components/CustomerAccountSidebar.vue";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";

const auth = useCustomerAuthStore();

const profileSaved = ref(false);
const passwordSaved = ref(false);
const profileError = ref("");
const passwordError = ref("");

const profileForm = ref({
  name: "",
  phone: "",
});

const passwordForm = ref({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const avatarUrl = computed(() => auth.user?.avatar || auth.user?.avatar_url || "");
const initials = computed(() =>
  (auth.user?.name || "KH")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join(""),
);

const fillProfile = async () => {
  const profile = auth.user || (await auth.fetchProfile().catch(() => null));
  if (!profile) return;
  profileForm.value.name = profile.name || "";
  profileForm.value.phone = profile.phone || "";
};

const saveProfile = async () => {
  profileSaved.value = false;
  profileError.value = "";
  try {
    await auth.updateProfile({
      name: profileForm.value.name.trim(),
      phone: profileForm.value.phone.trim(),
    });
    profileSaved.value = true;
  } catch (error) {
    profileError.value = getApiErrorMessage(error, "Không thể cập nhật hồ sơ.");
  }
};

const savePassword = async () => {
  passwordSaved.value = false;
  passwordError.value = "";

  if (!passwordForm.value.oldPassword || !passwordForm.value.newPassword) {
    passwordError.value = "Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới.";
    return;
  }

  if (passwordForm.value.newPassword.length < 6) {
    passwordError.value = "Mật khẩu mới phải có ít nhất 6 ký tự.";
    return;
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = "Xác nhận mật khẩu mới không khớp.";
    return;
  }

  try {
    await auth.changePassword({
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword,
    });
    passwordSaved.value = true;
    passwordForm.value.oldPassword = "";
    passwordForm.value.newPassword = "";
    passwordForm.value.confirmPassword = "";
  } catch (error) {
    passwordError.value = getApiErrorMessage(error, "Không thể đổi mật khẩu.");
  }
};

onMounted(fillProfile);
</script>

<template>
  <section class="profile-page theme-editorial">
    <CustomerAccountSidebar />

    <main class="profile-main">
      <header class="mobile-head">
        <RouterLink to="/account" aria-label="Quay lại"><ArrowLeft :size="24" /></RouterLink>
        <h1>Hồ sơ khách hàng</h1>
        <span></span>
      </header>

      <section class="profile-heading">
        <h1>Thông tin tài khoản</h1>
      </section>

      <div class="profile-grid">
        <section class="card identity-card">
          <div class="avatar-block">
            <div v-if="avatarUrl" class="avatar-photo large">
              <img :src="avatarUrl" :alt="auth.displayName" />
            </div>
            <div v-else class="avatar-fallback large">{{ initials }}</div>
            <div>
              <h2>{{ auth.displayName }}</h2>
              <p>{{ auth.user?.email || "Chưa có email" }}</p>
              <small>Thông tin này được dùng cho đơn hàng, thông báo và hỗ trợ khách hàng.</small>
            </div>
          </div>

          <form class="form-block" @submit.prevent="saveProfile">
            <label>
              <span>Họ và tên</span>
              <input v-model="profileForm.name" placeholder="Nhập họ và tên" />
            </label>
            <label>
              <span>Email</span>
              <div class="readonly-field">
                <input :value="auth.user?.email || ''" readonly />
                <ShieldCheck :size="18" />
              </div>
            </label>
            <label>
              <span>Số điện thoại</span>
              <input v-model="profileForm.phone" placeholder="Nhập số điện thoại" />
            </label>

            <p v-if="profileError" class="state error">{{ profileError }}</p>
            <p v-if="profileSaved" class="state success"><Check :size="18" /> Đã lưu thay đổi hồ sơ.</p>

            <button type="submit" class="primary-btn" :disabled="auth.loading">
              <Save :size="18" />
              {{ auth.loading ? "Đang lưu..." : "Lưu thông tin" }}
            </button>
          </form>
        </section>

        <section class="card password-card">
          <h2>Đổi mật khẩu</h2>
          <p>Nhập mật khẩu hiện tại và mật khẩu mới để bảo vệ tài khoản.</p>

          <form class="form-block" @submit.prevent="savePassword">
            <label>
              <span>Mật khẩu hiện tại</span>
              <div class="readonly-field">
                <input v-model="passwordForm.oldPassword" type="password" placeholder="Nhập mật khẩu hiện tại" />
                <Lock :size="18" />
              </div>
            </label>
            <label>
              <span>Mật khẩu mới</span>
              <input v-model="passwordForm.newPassword" type="password" placeholder="Nhập mật khẩu mới" />
            </label>
            <label>
              <span>Xác nhận mật khẩu mới</span>
              <input v-model="passwordForm.confirmPassword" type="password" placeholder="Nhập lại mật khẩu mới" />
            </label>

            <p v-if="passwordError" class="state error">{{ passwordError }}</p>
            <p v-if="passwordSaved" class="state success"><Check :size="18" /> Đã đổi mật khẩu thành công.</p>

            <button type="submit" class="primary-btn" :disabled="auth.loading">
              <Lock :size="18" />
              {{ auth.loading ? "Đang xử lý..." : "Cập nhật mật khẩu" }}
            </button>
          </form>
        </section>
      </div>
    </main>
  </section>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 320px 1fr;
  background: var(--sf-bg);
}

.avatar-photo,
.avatar-fallback {
  width: 64px;
  height: 64px;
  border-radius: 999px;
}

.avatar-photo img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.avatar-fallback {
  background: #dce8f7;
  color: var(--sf-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 20px;
}

.avatar-photo.large,
.avatar-fallback.large {
  width: 96px;
  height: 96px;
}

.profile-main {
  width: min(1120px, calc(100% - 64px));
  margin: 0 auto;
  padding: 42px 0 64px;
}

.mobile-head {
  display: none;
}

.profile-heading {
  padding: 0 0 28px;
}

.profile-heading h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1;
  letter-spacing: -0.05em;
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
  gap: 24px;
  align-items: start;
}

.card {
  padding: 28px;
  border-radius: 14px;
  background: #fff;
  box-shadow: var(--sf-shadow-soft);
}

.password-card {
  display: grid;
  gap: 18px;
}

.avatar-block {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 18px;
  align-items: center;
  margin-bottom: 28px;
}

.avatar-block h2,
.password-card h2 {
  margin: 0 0 8px;
  font-size: 26px;
  letter-spacing: -0.03em;
}

.avatar-block p,
.avatar-block small,
.password-card p {
  display: block;
  margin: 0;
  color: var(--sf-muted);
  line-height: 1.6;
}

.form-block {
  display: grid;
  gap: 18px;
}

.form-block label span {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #475467;
}

.form-block input {
  width: 100%;
  height: 52px;
  border: 1px solid #dce8f7;
  border-radius: 8px;
  padding: 0 14px;
  background: #fff;
  outline: none;
}

.form-block input:focus {
  border-color: var(--sf-primary);
  box-shadow: 0 0 0 3px var(--sf-primary-soft);
}

.readonly-field {
  position: relative;
}

.readonly-field input {
  padding-right: 42px;
}

.readonly-field svg {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
}

.primary-btn {
  height: 52px;
  border: none;
  border-radius: 8px;
  background: var(--sf-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 900;
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.state {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
}

.state.success {
  color: #16865a;
}

.state.error {
  color: var(--sf-danger);
}

@media (max-width: 980px) {
  .profile-page {
    display: block;
  }

  .profile-main {
    width: calc(100% - 32px);
    padding: 0 0 100px;
  }

  .mobile-head {
    height: 72px;
    display: grid;
    grid-template-columns: 40px 1fr 40px;
    align-items: center;
    margin: 0 -16px 24px;
    padding: 0 16px;
    background: #fff;
    border-bottom: 1px solid var(--sf-line);
  }

  .mobile-head h1 {
    margin: 0;
    text-align: center;
    font-size: 22px;
  }

  .profile-heading {
    padding: 0 0 24px;
  }

  .profile-heading h1 {
    font-size: 32px;
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }

  .avatar-block {
    grid-template-columns: 1fr;
  }
}
</style>
