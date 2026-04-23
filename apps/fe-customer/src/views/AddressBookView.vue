<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, Edit3, MapPin, Trash2 } from "lucide-vue-next";
import { addressApi, checkoutApi, getApiErrorMessage, type CustomerAddress, type CustomerAddressPayload } from "@/api/customer";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";
import { Navigation } from "lucide-vue-next";

const SELECTED_SHIPPING_ADDRESS_KEY = "selected_shipping_address";

const router = useRouter();
const auth = useCustomerAuthStore();
const addresses = ref<CustomerAddress[]>([]);
const loading = ref(false);
const saving = ref(false);
const geoLoading = ref(false);
const errorMessage = ref("");
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

const refreshProfile = async () => {
  await auth.fetchProfile().catch(() => null);
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

const selectAddress = (address: CustomerAddress) => {
  localStorage.setItem(SELECTED_SHIPPING_ADDRESS_KEY, JSON.stringify(address));
  router.push("/checkout");
};

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
    const created = await addressApi.create(payload);
    await Promise.all([loadAddresses(), refreshProfile()]);
    resetForm();
    selectAddress(created);
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
    const selected = localStorage.getItem(SELECTED_SHIPPING_ADDRESS_KEY);
    if (selected && JSON.parse(selected)?.id === address.id) localStorage.removeItem(SELECTED_SHIPPING_ADDRESS_KEY);
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
  } catch (err: any) {
    if (err?.code === 1) {
      errorMessage.value = "Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật trong cài đặt trình duyệt.";
    } else {
      errorMessage.value = getApiErrorMessage(err, "Không thể xác định vị trí của bạn.");
    }
  } finally {
    geoLoading.value = false;
  }
};

onMounted(loadAddresses);
</script>

<template>
  <section class="address-page">
    <header class="mobile-address-head">
      <RouterLink to="/checkout" aria-label="Quay lại"><ArrowLeft :size="26" /></RouterLink>
      <h1>Lựa chọn địa chỉ</h1>
      <span></span>
    </header>

    <div class="sf-container address-shell">
      <main class="saved-addresses">
        <nav class="address-breadcrumb">Trang chủ › Thanh toán › Lựa chọn địa chỉ</nav>
        <h1>Địa chỉ giao hàng</h1>
        <p v-if="errorMessage" class="address-error">{{ errorMessage }}</p>

        <div class="address-list">
          <p v-if="loading" class="address-empty">Đang tải sổ địa chỉ...</p>
          <p v-else-if="!sortedAddresses.length" class="address-empty">Bạn chưa có địa chỉ nào. Thêm địa chỉ mới để tiếp tục thanh toán.</p>
          <template v-else>
            <article v-for="address in sortedAddresses" :key="address.id" class="address-card">
              <span v-if="address.is_default" class="default-badge">Mặc định</span>
              <div class="address-main">
                <h2>{{ address.receiver_name }} <small>| {{ address.phone }}</small></h2>
                <p>{{ formatAddress(address) }}</p>
              </div>
              <div class="address-actions">
                <button type="button" :disabled="address.is_default" aria-label="Đặt mặc định" @click="setDefaultAddress(address)">
                  <Edit3 :size="20" />
                </button>
                <button v-if="!address.is_default" type="button" aria-label="Xóa" @click="removeAddress(address)"><Trash2 :size="20" /></button>
              </div>
              <button class="use-address" type="button" @click="selectAddress(address)">
                {{ address.is_default ? "Giao đến địa chỉ này" : "Chọn địa chỉ này" }}
              </button>
            </article>
          </template>
        </div>
      </main>

      <aside class="address-form-card">
      <h2>Thêm địa chỉ mới</h2>
      <button type="button" class="geo-btn" :disabled="geoLoading" @click="detectLocation">
        <Navigation :size="16" />
        {{ geoLoading ? "Đang xác định vị trí..." : "Dùng vị trí hiện tại" }}
      </button>
        <div class="form-grid">
          <label class="full">
            <span>Họ và tên người nhận</span>
            <input v-model="form.receiver_name" placeholder="Vd: Nguyễn Văn A" autocomplete="name" />
          </label>
          <label class="full">
            <span>Số điện thoại</span>
            <input v-model="form.phone" placeholder="Nhập số điện thoại" autocomplete="tel" />
          </label>
          <label>
            <span>Tỉnh/Thành phố</span>
            <input v-model="form.province" placeholder="Nhập Tỉnh/Thành" />
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
            <textarea v-model="form.address_detail" placeholder="Nhập số nhà, tên đường..."></textarea>
          </label>
        </div>
        <label class="default-row"><input v-model="form.is_default" type="checkbox" /> Đặt làm địa chỉ mặc định</label>
        <div class="form-actions">
          <button type="button" class="cancel" @click="resetForm">Hủy</button>
          <button type="button" class="save" :disabled="saving" @click="saveAddress">
            <MapPin :size="17" /> {{ saving ? "Đang lưu..." : "Lưu địa chỉ" }}
          </button>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.address-page {
  padding: 56px 0 72px;
  background: var(--sf-bg);
  min-height: 100vh;
}

.mobile-address-head {
  display: none;
}

.address-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.62fr);
  gap: 34px;
  align-items: start;
}

.address-breadcrumb {
  color: #6b4e43;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-weight: 800;
}

.saved-addresses h1 {
  margin: 18px 0 22px;
  font-size: clamp(32px, 4vw, 44px);
  line-height: 1;
  letter-spacing: -0.04em;
}

.address-error,
.address-empty {
  padding: 16px 18px;
  border-radius: 10px;
  background: #fff;
  color: var(--sf-primary);
  font-weight: 800;
}

.address-list {
  display: grid;
  gap: 18px;
}

.address-card,
.address-form-card {
  border: 1px solid #ead7cb;
  border-radius: 16px;
  background: #fff;
}

.address-card {
  position: relative;
  min-height: 180px;
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px;
}

.default-badge {
  position: absolute;
  top: 0;
  right: 0;
  padding: 7px 14px;
  border-radius: 0 16px 0 10px;
  background: var(--sf-accent);
  color: #fff;
  font-weight: 900;
  text-transform: uppercase;
  font-size: 12px;
}

.address-main h2 {
  margin: 0 0 18px;
  font-size: 20px;
  letter-spacing: -0.03em;
}

.address-main small {
  color: #5d4036;
  font-weight: 500;
}

.address-main p {
  max-width: 520px;
  margin: 0;
  color: #3f342f;
  line-height: 1.65;
  font-size: 15px;
}

.address-actions {
  display: flex;
  gap: 10px;
}

.address-actions button {
  border: none;
  background: transparent;
  color: #8d7c74;
}

.address-actions button:disabled {
  opacity: 0.35;
  cursor: default;
}

.use-address {
  grid-column: 1 / -1;
  justify-self: end;
  min-width: 240px;
  height: 48px;
  border: none;
  border-radius: 9px;
  background: var(--sf-primary);
  color: #fff;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 13px;
}

.address-card:not(:first-child) .use-address {
  background: #dce8f7;
  color: var(--sf-ink);
}

.address-form-card {
  padding: 28px;
  background: #edf4fd;
}

.address-form-card h2 {
  margin: 0 0 22px;
  font-size: 24px;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.geo-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  margin-bottom: 18px;
  border: 1.5px dashed var(--sf-accent, #d97706);
  border-radius: 10px;
  background: transparent;
  color: var(--sf-accent, #d97706);
  font-weight: 800;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  justify-content: center;
  transition: all 0.2s;
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
select,
textarea {
  width: 100%;
  border: 1px solid #c7d3e2;
  border-radius: 8px;
  background: #dce8f7;
  outline: none;
  color: var(--sf-ink);
  font-size: 15px;
}

input,
select {
  height: 46px;
  padding: 0 14px;
}

textarea {
  min-height: 92px;
  padding: 12px 14px;
  resize: vertical;
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

.form-actions button {
  height: 48px;
  border-radius: 9px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 13px;
}

.cancel {
  border: 1px solid #d6c3b8;
  background: transparent;
  color: var(--sf-primary);
}

.save {
  border: none;
  background: var(--sf-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.save:disabled {
  opacity: 0.7;
  cursor: wait;
}

@media (max-width: 980px) {
  .address-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .address-page {
    padding: 0 0 90px;
  }

  .mobile-address-head {
    height: 70px;
    display: grid;
    grid-template-columns: 42px 1fr 42px;
    align-items: center;
    padding: 0 20px;
  }

  .mobile-address-head h1 {
    margin: 0;
    text-align: center;
    font-size: 23px;
  }

  .address-shell {
    width: calc(100% - 38px);
    gap: 36px;
  }

  .address-breadcrumb,
  .saved-addresses h1 {
    display: none;
  }

  .address-list::before {
    content: "Địa chỉ đã lưu";
    display: block;
    color: #75635c;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  .address-card {
    display: block;
    min-height: 0;
    padding: 26px 22px;
  }

  .address-actions {
    position: absolute;
    top: 26px;
    right: 22px;
  }

  .address-main h2 {
    padding-right: 90px;
    margin-bottom: 18px;
  }

  .address-main p {
    font-size: 16px;
  }

  .use-address {
    width: 100%;
    min-width: 0;
    margin-top: 26px;
  }

  .default-badge {
    position: static;
    display: inline-flex;
    margin-left: 8px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    vertical-align: middle;
  }

  .address-form-card {
    padding: 24px;
    border-radius: 16px;
  }

  .address-form-card h2 {
    font-size: 20px;
    color: #75635c;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    grid-template-columns: 1fr;
  }
}
</style>
