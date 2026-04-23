<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ArrowLeft, MapPin, Navigation, Star, Trash2, X } from "lucide-vue-next";
import CustomerAccountSidebar from "@/components/CustomerAccountSidebar.vue";
import { addressApi, checkoutApi, getApiErrorMessage, type CustomerAddress, type CustomerAddressPayload } from "@/api/customer";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";

const auth = useCustomerAuthStore();
const loading = ref(false);
const saving = ref(false);
const geoLoading = ref(false);
const errorMessage = ref("");
const showCreateModal = ref(false);
const addresses = ref<CustomerAddress[]>([]);
const form = ref<CustomerAddressPayload>({
  receiver_name: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  address_detail: "",
  is_default: false,
});

const sortedAddresses = computed(() =>
  [...addresses.value].sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default))),
);

const formatAddress = (address: CustomerAddress) =>
  [address.address_detail, address.ward, address.district, address.province].filter(Boolean).join(", ");

const resetForm = () => {
  form.value = {
    receiver_name: "",
    phone: "",
    province: "",
    district: "",
    ward: "",
    address_detail: "",
    is_default: false,
  };
};

const openCreateModal = () => {
  errorMessage.value = "";
  resetForm();
  showCreateModal.value = true;
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  geoLoading.value = false;
  resetForm();
};

const loadAddresses = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    addresses.value = await addressApi.getAll();
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Không thể tải sổ địa chỉ.");
  } finally {
    loading.value = false;
  }
};

const refreshProfile = async () => {
  await auth.fetchProfile().catch(() => null);
};

const saveAddress = async () => {
  errorMessage.value = "";
  const payload: CustomerAddressPayload = {
    ...form.value,
    receiver_name: form.value.receiver_name.trim(),
    phone: form.value.phone.trim(),
    province: form.value.province?.trim() || "",
    district: form.value.district?.trim() || "",
    ward: form.value.ward?.trim() || "",
    address_detail: form.value.address_detail.trim(),
  };

  if (!payload.receiver_name || !payload.phone || !payload.province || !payload.district || !payload.ward || !payload.address_detail) {
    errorMessage.value = "Vui lòng nhập đầy đủ thông tin địa chỉ.";
    return;
  }

  saving.value = true;
  try {
    await addressApi.create(payload);
    await Promise.all([loadAddresses(), refreshProfile()]);
    closeCreateModal();
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Không thể lưu địa chỉ.");
  } finally {
    saving.value = false;
  }
};

const setDefaultAddress = async (address: CustomerAddress) => {
  if (address.is_default) return;

  errorMessage.value = "";
  try {
    await addressApi.update(address.id, { is_default: true });
    await Promise.all([loadAddresses(), refreshProfile()]);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Không thể đặt địa chỉ mặc định.");
  }
};

const removeAddress = async (address: CustomerAddress) => {
  if (!window.confirm("Xóa địa chỉ này?")) return;

  errorMessage.value = "";
  try {
    await addressApi.remove(address.id);
    await Promise.all([loadAddresses(), refreshProfile()]);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Không thể xóa địa chỉ.");
  }
};

const detectLocation = async () => {
  if (!navigator.geolocation) {
    errorMessage.value = "Trình duyệt không hỗ trợ định vị.";
    return;
  }

  geoLoading.value = true;
  errorMessage.value = "";

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }),
    );

    const result = await checkoutApi.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    form.value.province = result.province || form.value.province;
    form.value.district = result.district || form.value.district;
    form.value.ward = result.ward || form.value.ward;
    form.value.address_detail = result.address_detail || form.value.address_detail;
  } catch (error: any) {
    if (error?.code === 1) {
      errorMessage.value = "Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật lại trong cài đặt trình duyệt.";
    } else {
      errorMessage.value = getApiErrorMessage(error, "Không thể xác định vị trí của bạn.");
    }
  } finally {
    geoLoading.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadAddresses(), refreshProfile()]);
});
</script>

<template>
  <section class="addresses-page theme-editorial">
    <CustomerAccountSidebar />

    <main class="addresses-main">
      <header class="mobile-head">
        <RouterLink to="/account" aria-label="Quay lại">
          <ArrowLeft :size="24" />
        </RouterLink>
        <h1>Sổ địa chỉ</h1>
        <span></span>
      </header>

      <section class="desktop-heading">
        <div>
          <h1>Sổ địa chỉ</h1>
          <p>Lưu các địa chỉ nhận hàng thường dùng để dùng lại nhanh hơn cho những đơn tiếp theo.</p>
        </div>
        <button class="primary-action" type="button" @click="openCreateModal">
          <MapPin :size="18" />
          Thêm địa chỉ mới
        </button>
      </section>

      <p v-if="errorMessage && !showCreateModal" class="feedback-card">{{ errorMessage }}</p>

      <section class="address-list-shell">
        <div class="list-meta">
          <span>Địa chỉ đã lưu</span>
          <strong>{{ sortedAddresses.length }} địa chỉ</strong>
        </div>

        <div class="address-grid">
          <p v-if="loading" class="state-card">Đang tải sổ địa chỉ...</p>

          <template v-else-if="sortedAddresses.length">
            <article v-for="address in sortedAddresses" :key="address.id" :class="['address-card', { active: address.is_default }]">
              <div class="address-card-top">
                <div class="address-copy">
                  <h2>
                    {{ address.receiver_name }}
                    <span v-if="address.is_default">Mặc định</span>
                  </h2>
                  <p class="phone">{{ address.phone }}</p>
                  <p>{{ formatAddress(address) }}</p>
                </div>

                <div class="address-actions">
                  <button
                    type="button"
                    :disabled="address.is_default"
                    aria-label="Đặt mặc định"
                    title="Đặt làm mặc định"
                    @click="setDefaultAddress(address)"
                  >
                    <Star :size="18" />
                  </button>
                  <button type="button" aria-label="Xóa" title="Xóa địa chỉ" @click="removeAddress(address)">
                    <Trash2 :size="18" />
                  </button>
                </div>
              </div>
            </article>
          </template>

          <section v-else class="state-card empty-card">
            <h2>Chưa có địa chỉ nào</h2>
            <p>Thêm địa chỉ nhận hàng để checkout nhanh hơn ở lần mua tiếp theo.</p>
            <button type="button" class="primary-action" @click="openCreateModal">Thêm địa chỉ đầu tiên</button>
          </section>
        </div>
      </section>
    </main>

    <div v-if="showCreateModal" class="address-modal-backdrop" @click.self="closeCreateModal">
      <section class="address-modal" role="dialog" aria-modal="true" aria-labelledby="create-address-title">
        <header class="modal-head">
          <div>
            <span class="modal-kicker">Thêm địa chỉ mới</span>
            <h2 id="create-address-title">Thông tin nhận hàng</h2>
          </div>
          <button type="button" class="icon-close" aria-label="Đóng" @click="closeCreateModal">
            <X :size="18" />
          </button>
        </header>

        <p v-if="errorMessage" class="feedback-card modal-feedback">{{ errorMessage }}</p>

        <button type="button" class="geo-btn" :disabled="geoLoading" @click="detectLocation">
          <Navigation :size="16" />
          {{ geoLoading ? "Đang xác định vị trí..." : "Dùng vị trí hiện tại" }}
        </button>

        <div class="form-grid">
          <label class="full">
            <span>Họ và tên người nhận</span>
            <input v-model="form.receiver_name" placeholder="Ví dụ: Nguyễn Văn A" autocomplete="name" />
          </label>

          <label class="full">
            <span>Số điện thoại</span>
            <input v-model="form.phone" placeholder="Nhập số điện thoại" autocomplete="tel" />
          </label>

          <label>
            <span>Tỉnh/Thành phố</span>
            <input v-model="form.province" placeholder="Nhập Tỉnh/Thành phố" />
          </label>

          <label>
            <span>Quận/Huyện</span>
            <input v-model="form.district" placeholder="Nhập Quận/Huyện" />
          </label>

          <label class="full">
            <span>Phường/Xã</span>
            <input v-model="form.ward" placeholder="Nhập Phường/Xã" />
          </label>

          <label class="full">
            <span>Địa chỉ cụ thể</span>
            <textarea v-model="form.address_detail" placeholder="Nhập số nhà, tên đường..." />
          </label>
        </div>

        <label class="default-row">
          <input v-model="form.is_default" type="checkbox" />
          Đặt làm địa chỉ mặc định
        </label>

        <div class="form-actions">
          <button type="button" class="secondary-action" @click="closeCreateModal">Hủy</button>
          <button type="button" class="primary-action" :disabled="saving" @click="saveAddress">
            <MapPin :size="17" />
            {{ saving ? "Đang lưu..." : "Lưu địa chỉ" }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.addresses-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 320px 1fr;
  background: var(--sf-bg);
  color: var(--sf-ink);
}

.addresses-main {
  width: min(1120px, calc(100% - 64px));
  margin: 0 auto;
  padding: 42px 0 64px;
}

.mobile-head {
  display: none;
}

.desktop-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 24px;
}

.desktop-heading h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1;
  letter-spacing: -0.05em;
}

.desktop-heading p {
  margin: 10px 0 0;
  max-width: 640px;
  color: #6a5044;
  line-height: 1.6;
}

.primary-action,
.secondary-action {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border-radius: 8px;
  font-weight: 900;
}

.primary-action {
  border: none;
  background: var(--sf-primary);
  color: #fff;
}

.secondary-action {
  border: 1px solid #d6c3b8;
  background: #fff;
  color: var(--sf-primary);
}

.feedback-card,
.state-card {
  padding: 16px 18px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--sf-shadow-soft);
}

.feedback-card {
  margin: 0 0 18px;
  color: var(--sf-primary);
  font-weight: 800;
}

.address-list-shell {
  display: grid;
  gap: 18px;
}

.list-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.list-meta span {
  color: #7a6156;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 12px;
}

.list-meta strong {
  font-size: 14px;
}

.address-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.address-card {
  padding: 24px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--sf-shadow-soft);
}

.address-card.active {
  box-shadow: inset 4px 0 0 var(--sf-primary), var(--sf-shadow-soft);
}

.address-card-top {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.address-copy {
  min-width: 0;
}

.address-card h2 {
  margin: 0 0 10px;
  font-size: 24px;
  line-height: 1.1;
}

.address-card h2 span {
  display: inline-flex;
  margin-left: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f2e4dc;
  color: var(--sf-primary);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.phone,
.address-card p,
.empty-card p {
  margin: 0;
  color: #5c4037;
  line-height: 1.7;
}

.phone {
  margin-bottom: 8px;
  font-weight: 800;
  color: var(--sf-ink);
}

.address-actions {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
}

.address-actions button,
.icon-close {
  width: 38px;
  height: 38px;
  border: 1px solid #ead7cb;
  border-radius: 10px;
  background: #fff;
  color: #8c817b;
}

.address-actions button:disabled {
  opacity: 0.4;
  cursor: default;
}

.empty-card {
  grid-column: 1 / -1;
}

.empty-card h2 {
  margin: 0 0 10px;
}

.empty-card .primary-action {
  margin-top: 18px;
}

.address-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 24, 39, 0.35);
  backdrop-filter: blur(6px);
}

.address-modal {
  width: min(720px, 100%);
  max-height: min(88vh, 920px);
  overflow: auto;
  padding: 28px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 80px rgba(26, 18, 13, 0.22);
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.modal-kicker {
  display: inline-block;
  margin-bottom: 8px;
  color: #7a6156;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 12px;
}

.modal-head h2 {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.modal-feedback {
  margin-bottom: 18px;
  background: #fff8f4;
  box-shadow: none;
}

.geo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 46px;
  margin-bottom: 18px;
  border: 1.5px dashed var(--sf-accent, #d97706);
  border-radius: 10px;
  background: #fffaf6;
  color: var(--sf-accent, #d97706);
  font-weight: 800;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.geo-btn:hover:not(:disabled) {
  background: var(--sf-accent, #d97706);
  color: #fff;
}

.geo-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-grid .full {
  grid-column: 1 / -1;
}

label span {
  display: block;
  margin-bottom: 7px;
  font-weight: 800;
  font-size: 13px;
}

input,
textarea {
  width: 100%;
  border: 1px solid #d7e0eb;
  border-radius: 10px;
  background: #f8fbff;
  outline: none;
  color: var(--sf-ink);
  font-size: 15px;
}

input {
  height: 48px;
  padding: 0 14px;
}

textarea {
  min-height: 104px;
  padding: 12px 14px;
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: var(--sf-primary);
  box-shadow: 0 0 0 3px var(--sf-primary-soft);
}

.default-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 20px 0 24px;
  font-weight: 800;
  font-size: 14px;
}

.default-row input {
  width: 18px;
  height: 18px;
}

.form-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-actions .primary-action,
.form-actions .secondary-action {
  min-height: 48px;
}

.primary-action:disabled {
  opacity: 0.7;
  cursor: wait;
}

@media (max-width: 980px) {
  .addresses-page {
    display: block;
  }

  .addresses-main {
    width: calc(100% - 32px);
    padding-top: 0;
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

  .desktop-heading {
    display: block;
  }

  .desktop-heading .primary-action {
    margin-top: 16px;
  }

  .address-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .address-card-top {
    display: block;
  }

  .address-actions {
    margin-top: 18px;
  }

  .address-modal-backdrop {
    padding: 12px;
    align-items: end;
  }

  .address-modal {
    width: 100%;
    max-height: 92vh;
    padding: 22px;
    border-radius: 20px 20px 0 0;
  }

  .form-grid,
  .form-actions {
    grid-template-columns: 1fr;
  }
}
</style>
