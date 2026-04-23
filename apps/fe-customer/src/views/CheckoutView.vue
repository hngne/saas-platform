<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CreditCard,
  Lock,
  MapPin,
  Truck,
  User,
  WalletCards,
} from "lucide-vue-next";
import {
  checkoutApi,
  getApiErrorMessage,
  type CustomerAddress,
  type CustomerOrder,
  type ShippingMethod,
  type StoreLocation,
} from "@/api/customer";
import { formatVnd } from "@/data/storefront";
import { useCartStore } from "@/stores/cart.store";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";
import {
  clearPendingVnpayOrder,
  isPendingVnpayOrder,
  readPendingVnpayOrder,
  savePendingVnpayOrder,
} from "@/utils/pending-payment";

const router = useRouter();
const cart = useCartStore();
const auth = useCustomerAuthStore();
const SELECTED_SHIPPING_ADDRESS_KEY = "selected_shipping_address";
const { items, subtotal, discount, voucherCode, voucherMessage, voucherApplying } = storeToRefs(cart);
const pickup = ref(false);
const shippingMethods = ref<ShippingMethod[]>([]);
const pickupStores = ref<StoreLocation[]>([]);
const selectedShippingAddress = ref<CustomerAddress | null>(null);
const selectedShippingId = ref("");
const selectedStoreId = ref("");
const paymentMethod = ref<"COD" | "VNPAY">("COD");
const voucherInput = ref(voucherCode.value);
const placing = ref(false);
const pendingPaymentLoading = ref(false);
const pendingPaymentOrder = ref<CustomerOrder | null>(null);
const errorMessage = ref("");

const form = ref({
  name: "",
  phone: "",
  email: "",
  province: "",
  district: "",
  ward: "",
  addressDetail: "",
  note: "",
});

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const shippingOptions = computed(() => shippingMethods.value);
const selectedShipping = computed(
  () =>
    shippingOptions.value.find((method) => method.id === selectedShippingId.value) ||
    shippingOptions.value[0],
);
const selectedStore = computed(
  () => pickupStores.value.find((store) => store.id === selectedStoreId.value) || pickupStores.value[0],
);
const shippingFee = computed(() => (pickup.value ? 0 : selectedShipping.value?.fee || 0));
const total = computed(() => Math.max(subtotal.value + shippingFee.value - discount.value, 0));
const hasPendingPayment = computed(() => isPendingVnpayOrder(pendingPaymentOrder.value));

const deliveryAddress = computed(() => {
  if (pickup.value && selectedStore.value) return selectedStore.value.address;
  return [
    form.value.addressDetail,
    form.value.ward,
    form.value.district,
    form.value.province,
  ]
    .filter(Boolean)
    .join(", ");
});

const formatCustomerAddress = (address: CustomerAddress) =>
  [address.address_detail, address.ward, address.district, address.province]
    .filter(Boolean)
    .join(", ");

const applyCustomerAddress = (address: CustomerAddress) => {
  selectedShippingAddress.value = address;
  form.value.name = address.receiver_name || form.value.name;
  form.value.phone = address.phone || form.value.phone;
  form.value.province = address.province || "";
  form.value.district = address.district || "";
  form.value.ward = address.ward || "";
  form.value.addressDetail = address.address_detail || "";
};

const loadSelectedShippingAddress = () => {
  try {
    const storedAddress = localStorage.getItem(SELECTED_SHIPPING_ADDRESS_KEY);
    if (!storedAddress) return;
    const parsed = JSON.parse(storedAddress) as CustomerAddress;
    if (parsed?.id) applyCustomerAddress(parsed);
  } catch {
    localStorage.removeItem(SELECTED_SHIPPING_ADDRESS_KEY);
  }
};

const fillProfile = async () => {
  const profile = auth.user || (await auth.fetchProfile().catch(() => null));
  if (!profile) return;

  form.value.name = profile.name || "";
  form.value.email = profile.email || "";
  form.value.phone = profile.phone || "";

  const address = auth.defaultAddress;
  if (address) applyCustomerAddress(address);
};

const loadCheckoutData = async () => {
  const [shippingResult, storesResult] = await Promise.allSettled([
    checkoutApi.getShippingMethods(),
    checkoutApi.getStores(),
  ]);

  if (shippingResult.status === "fulfilled") shippingMethods.value = shippingResult.value;
  if (storesResult.status === "fulfilled") pickupStores.value = storesResult.value;

  selectedShippingId.value = shippingOptions.value[0]?.id || "";
  selectedStoreId.value = pickupStores.value[0]?.id || "";

  try {
    const storedPickup = localStorage.getItem("selected_pickup_store");
    if (!storedPickup) return;
    const parsed = JSON.parse(storedPickup) as StoreLocation;
    if (!parsed?.id) return;

    selectedStoreId.value = parsed.id;
    if (!pickupStores.value.some((store) => store.id === parsed.id)) {
      pickupStores.value.unshift(parsed);
    }
  } catch {
    localStorage.removeItem("selected_pickup_store");
  }
};

const placeOrder = async () => {
  errorMessage.value = "";

  if (hasPendingPayment.value) {
    errorMessage.value = "Bạn có đơn VNPay đang chờ thanh toán. Vui lòng thanh toán tiếp hoặc xem chi tiết đơn hàng.";
    return;
  }

  if (!auth.isAuthenticated) {
    await router.push({ name: "login", query: { redirect: "/checkout" } });
    return;
  }

  if (!items.value.length) {
    errorMessage.value = "Giỏ hàng đang trống.";
    return;
  }

  if (!form.value.name || !form.value.phone || !deliveryAddress.value) {
    errorMessage.value = "Vui lòng nhập đủ thông tin nhận hàng.";
    return;
  }

  placing.value = true;
  try {
    if (voucherInput.value.trim()) {
      const applied = await cart.applyVoucher(voucherInput.value, shippingFee.value);
      if (!applied) {
        placing.value = false;
        return;
      }
    }

    await cart.syncToServer();
    const order = await checkoutApi.checkout({
      receiver_name: form.value.name,
      receiver_phone: form.value.phone,
      shipping_address: deliveryAddress.value,
      shipping_method_id:
        pickup.value || !isUuid(selectedShippingId.value) ? undefined : selectedShippingId.value,
      pickup_store_id:
        pickup.value && isUuid(selectedStoreId.value) ? selectedStoreId.value : undefined,
      voucher_code: voucherCode.value.trim() || undefined,
      payment_method: paymentMethod.value,
      note: form.value.note.trim() || undefined,
    });

    sessionStorage.setItem("last_customer_order", JSON.stringify(order));

    if (paymentMethod.value === "VNPAY") {
      savePendingVnpayOrder(order);
      pendingPaymentOrder.value = order;
      cart.clear();
      const paymentUrl = await checkoutApi.createPaymentUrl(order.id);
      window.location.href = paymentUrl;
      return;
    }

    cart.clear();
    await router.push({ name: "order-success", query: { order_id: order.id, method: "COD" } });
  } catch (error) {
    errorMessage.value = getApiErrorMessage(
      error,
      "Không thể đặt hàng. Vui lòng kiểm tra lại giỏ hàng.",
    );
  } finally {
    placing.value = false;
  }
};

const continuePendingPayment = async () => {
  if (!pendingPaymentOrder.value || pendingPaymentLoading.value) return;

  errorMessage.value = "";
  pendingPaymentLoading.value = true;
  try {
    const freshOrder = await checkoutApi.getOrderById(pendingPaymentOrder.value.id);
    if (!isPendingVnpayOrder(freshOrder)) {
      clearPendingVnpayOrder();
      pendingPaymentOrder.value = null;
      errorMessage.value = "Đơn VNPay này không còn ở trạng thái chờ thanh toán.";
      return;
    }

    savePendingVnpayOrder(freshOrder);
    pendingPaymentOrder.value = freshOrder;
    sessionStorage.setItem("last_customer_order", JSON.stringify(freshOrder));
    const paymentUrl = await checkoutApi.createPaymentUrl(freshOrder.id);
    window.location.href = paymentUrl;
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Không thể tạo lại link thanh toán VNPay.");
  } finally {
    pendingPaymentLoading.value = false;
  }
};

const loadPendingPaymentOrder = async () => {
  const storedOrder = readPendingVnpayOrder();
  if (!storedOrder) return;

  pendingPaymentOrder.value = storedOrder;
  try {
    const freshOrder = await checkoutApi.getOrderById(storedOrder.id);
    if (isPendingVnpayOrder(freshOrder)) {
      pendingPaymentOrder.value = freshOrder;
      savePendingVnpayOrder(freshOrder);
      return;
    }
    pendingPaymentOrder.value = null;
    clearPendingVnpayOrder();
  } catch {
    pendingPaymentOrder.value = storedOrder;
  }
};

watch(shippingOptions, (options) => {
  if (!selectedShippingId.value && options[0]) selectedShippingId.value = options[0].id;
});

watch(voucherCode, (code) => {
  voucherInput.value = code;
});

const applyVoucher = () => {
  cart.applyVoucher(voucherInput.value, shippingFee.value);
};

onMounted(async () => {
  await Promise.all([fillProfile(), loadCheckoutData()]);
  await loadPendingPaymentOrder();
  loadSelectedShippingAddress();
  if (voucherCode.value) {
    voucherInput.value = voucherCode.value;
    await cart.applyVoucher(voucherCode.value, shippingFee.value);
  }
});
</script>

<template>
  <section class="checkout-page">
    <header class="checkout-top sf-container">
      <RouterLink to="/" class="checkout-brand">The Merchant</RouterLink>
      <RouterLink to="/cart" class="back-cart"><ArrowLeft :size="16" /> Trở về giỏ hàng</RouterLink>
    </header>

    <div class="mobile-checkout-head">
      <RouterLink to="/cart" aria-label="Quay lại"><ArrowLeft :size="26" /></RouterLink>
      <h1>Thanh toán</h1>
      <span></span>
    </div>

    <div class="sf-container checkout-shell">
      <main class="checkout-form">
        <section v-if="hasPendingPayment && pendingPaymentOrder" class="checkout-card pending-payment-card">
          <h2><CreditCard :size="22" /> Đơn VNPay đang chờ thanh toán</h2>
          <p>
            Đơn {{ pendingPaymentOrder.code }} đã được tạo và đang chờ VNPay xác nhận. Bạn có thể thanh toán tiếp
            hoặc xem chi tiết đơn hàng, hệ thống sẽ không tạo thêm đơn mới từ checkout này.
          </p>
          <div class="pending-payment-meta">
            <span>Tổng tiền</span>
            <strong>{{ formatVnd(pendingPaymentOrder.total) }}</strong>
          </div>
          <div class="pending-payment-actions">
            <button type="button" class="sf-button" :disabled="pendingPaymentLoading" @click="continuePendingPayment">
              {{ pendingPaymentLoading ? "Đang chuyển..." : "Thanh toán tiếp" }}
            </button>
            <RouterLink :to="`/account/orders/${pendingPaymentOrder.id}`" class="sf-button ghost">
              Xem chi tiết đơn hàng
            </RouterLink>
          </div>
          <p v-if="errorMessage" class="checkout-error">{{ errorMessage }}</p>
        </section>

        <template v-else>
        <section class="checkout-card">
          <h2><User :size="22" /> Thông tin khách hàng</h2>
          <div class="form-grid customer-grid">
            <label class="full">
              <span>Họ và tên</span>
              <input v-model="form.name" placeholder="Nhập họ và tên" autocomplete="name" />
            </label>
            <label>
              <span>Số điện thoại</span>
              <input v-model="form.phone" autocomplete="tel" placeholder="Nhập số điện thoại" />
            </label>
            <label>
              <span>Email</span>
              <input v-model="form.email" autocomplete="email" placeholder="Nhập địa chỉ email" />
            </label>
          </div>
        </section>

        <section class="checkout-card">
          <div class="card-heading">
            <h2><MapPin :size="22" /> Địa chỉ giao hàng</h2>
            <div class="address-heading-actions">
              <RouterLink v-if="!pickup" to="/checkout/addresses" class="change-address-link">Chọn địa chỉ</RouterLink>
              <label class="pickup-toggle"><input v-model="pickup" type="checkbox" /> Nhận tại cửa hàng</label>
            </div>
          </div>
          <RouterLink v-if="pickup" to="/checkout/pickup" class="selected-address">
            <strong>{{ selectedStore?.name || "Chọn điểm nhận hàng" }}</strong>
            <span>{{ selectedStore?.address || "Chưa chọn cửa hàng nhận hàng" }}</span>
          </RouterLink>
          <template v-else>
            <RouterLink v-if="selectedShippingAddress" to="/checkout/addresses" class="selected-address delivery-selected">
              <strong>{{ selectedShippingAddress.receiver_name }} - {{ selectedShippingAddress.phone }}</strong>
              <span>{{ formatCustomerAddress(selectedShippingAddress) }}</span>
            </RouterLink>
            <div class="form-grid">
              <label>
                <span>Tỉnh/Thành phố</span>
                <input v-model="form.province" placeholder="Nhập Tỉnh/Thành" />
              </label>
              <label>
                <span>Quận/Huyện</span>
                <input v-model="form.district" placeholder="Nhập Quận/Huyện" />
              </label>
              <label>
                <span>Phường/Xã</span>
                <input v-model="form.ward" placeholder="Nhập Phường/Xã" />
              </label>
              <label>
                <span>Số nhà, tên đường</span>
                <input v-model="form.addressDetail" placeholder="Nhập số nhà, tên đường" />
              </label>
              <label class="full">
                <span>Ghi chú cho người bán</span>
                <textarea v-model="form.note" placeholder="Ví dụ: Giao hàng giờ hành chính..."></textarea>
              </label>
            </div>
          </template>
        </section>

        <section class="checkout-card">
          <h2><Truck :size="22" /> Phương thức vận chuyển</h2>
          <div v-if="shippingOptions.length" class="choice-list">
            <label v-for="method in shippingOptions" :key="method.id" :class="{ active: selectedShippingId === method.id }">
              <input v-model="selectedShippingId" type="radio" :value="method.id" :disabled="pickup" />
              <span><strong>{{ method.name }}</strong><small>{{ method.description || method.estimated_days || "Phí vận chuyển được tính theo cấu hình của cửa hàng" }}</small></span>
              <b>{{ pickup ? "Miễn phí" : formatVnd(method.fee) }}</b>
            </label>
          </div>
          <p v-else class="shipping-empty">
            Shop chưa cấu hình phương thức vận chuyển active. Phí vận chuyển hiện chưa thể tính ở bước này.
          </p>
        </section>

        <section class="checkout-card">
          <h2><Banknote :size="22" /> Phương thức thanh toán</h2>
          <div class="choice-list payment-list">
            <label :class="{ active: paymentMethod === 'COD' }">
              <input v-model="paymentMethod" type="radio" value="COD" />
              <span><strong>Thanh toán khi nhận hàng (COD)</strong></span>
              <WalletCards :size="20" />
            </label>
            <label :class="{ active: paymentMethod === 'VNPAY' }">
              <input v-model="paymentMethod" type="radio" value="VNPAY" />
              <span><strong>Chuyển khoản VNPay</strong></span>
              <CreditCard :size="20" />
            </label>
          </div>
        </section>
        </template>
      </main>

      <aside v-if="!hasPendingPayment" class="order-summary">
        <h2>Tóm tắt đơn hàng</h2>
        <div class="summary-items">
          <article v-for="item in items" :key="item.id">
            <div class="summary-img">
              <img :src="item.product.image" :alt="item.product.name" />
              <span>{{ item.quantity }}</span>
            </div>
            <div>
              <strong>{{ item.product.name }}</strong>
              <small>{{ item.variant }}</small>
            </div>
            <b>{{ formatVnd(item.product.price * item.quantity) }}</b>
          </article>
        </div>

        <div class="coupon-row">
          <input v-model="voucherInput" placeholder="Nhập mã (nếu có)" @keyup.enter="applyVoucher" />
          <button type="button" :disabled="voucherApplying" @click="applyVoucher">
            {{ voucherApplying ? "Đang áp dụng" : "Áp dụng" }}
          </button>
        </div>
        <div v-if="voucherMessage || voucherCode" class="coupon-state">
          <span v-if="voucherMessage">{{ voucherMessage }}</span>
          <button v-if="voucherCode" type="button" @click="cart.clearVoucher()">Bỏ mã {{ voucherCode }}</button>
        </div>

        <dl>
          <div><dt>Tạm tính</dt><dd>{{ formatVnd(subtotal) }}</dd></div>
          <div><dt>Phí vận chuyển</dt><dd>{{ shippingOptions.length || pickup ? formatVnd(shippingFee) : "Chưa tính" }}</dd></div>
          <div><dt>Giảm giá</dt><dd>{{ discount ? `- ${formatVnd(discount)}` : "Chưa áp dụng" }}</dd></div>
        </dl>
        <div class="total-line">
          <span>Tổng thanh toán</span>
          <strong>{{ formatVnd(total) }}</strong>
        </div>
        <p v-if="errorMessage" class="checkout-error">{{ errorMessage }}</p>
        <button type="button" class="sf-button place-order" :disabled="placing" @click="placeOrder">
          {{ placing ? "Đang đặt hàng..." : "Đặt hàng" }} <ArrowRight :size="20" />
        </button>
        <p class="secure-note"><Lock :size="14" /> Thông tin của bạn được bảo mật an toàn</p>
      </aside>
    </div>

    <div v-if="!hasPendingPayment" class="checkout-mobile-bar">
      <span>Tổng cộng</span>
      <strong>{{ formatVnd(total) }}</strong>
      <button type="button" :disabled="placing" @click="placeOrder">
        {{ placing ? "Đang đặt hàng..." : "Đặt hàng" }} <ArrowRight :size="18" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.checkout-page {
  min-height: 100vh;
  padding-bottom: 70px;
  background: var(--sf-bg);
}

.checkout-top {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.checkout-brand {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.back-cart {
  color: var(--sf-primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
}

.mobile-checkout-head {
  display: none;
}

.checkout-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 520px;
  gap: 48px;
  align-items: start;
}

.checkout-form {
  display: grid;
  gap: 28px;
}

.checkout-card,
.order-summary {
  border-radius: 20px;
  background: #edf4fd;
  padding: 34px;
}

.checkout-card h2,
.order-summary h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 26px;
  font-size: 24px;
  letter-spacing: -0.03em;
}

.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.address-heading-actions {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.change-address-link {
  color: var(--sf-primary);
  font-weight: 900;
}

.pickup-toggle {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  width: auto;
  min-height: 36px;
  margin: 0;
  padding: 8px 12px;
  border: 1px solid #d8e4f2;
  border-radius: 999px;
  background: #fff;
  color: #354154;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
}

.pickup-toggle input {
  width: 16px;
  height: 16px;
  padding: 0;
  border-radius: 5px;
  accent-color: var(--sf-primary);
}

.pickup-toggle:has(input:checked) {
  border-color: color-mix(in srgb, var(--sf-primary) 55%, #fff);
  background: color-mix(in srgb, var(--sf-primary) 10%, #fff);
  color: var(--sf-primary);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.form-grid .full {
  grid-column: 1 / -1;
}

label span {
  display: block;
  margin-bottom: 8px;
  font-weight: 800;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid #cdd8e7;
  border-radius: 8px;
  background: #dce8f7;
  color: var(--sf-ink);
  outline: none;
  font-size: 16px;
}

input,
select {
  height: 54px;
  padding: 0 18px;
}

textarea {
  min-height: 106px;
  padding: 16px 18px;
  resize: vertical;
}

.selected-address {
  display: grid;
  gap: 8px;
  padding: 22px;
  border-radius: 12px;
  background: #fff;
}

.delivery-selected {
  margin-bottom: 20px;
  border: 1px solid #d8e4f2;
}

.choice-list {
  display: grid;
  gap: 16px;
}

.choice-list label {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  gap: 14px;
  min-height: 84px;
  padding: 18px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: #fff;
}

.choice-list label.active {
  border-color: var(--sf-primary);
}

.choice-list input {
  width: 18px;
  height: 18px;
  accent-color: var(--sf-primary);
}

.choice-list strong,
.choice-list small {
  display: block;
}

.choice-list small {
  margin-top: 4px;
  color: var(--sf-muted);
}

.shipping-empty {
  margin: 0;
  padding: 18px;
  border-radius: 12px;
  background: #fff;
  color: #64748b;
  line-height: 1.6;
}

.pending-payment-card {
  min-height: 360px;
  display: grid;
  align-content: center;
  gap: 22px;
}

.pending-payment-card p {
  max-width: 720px;
  margin: 0;
  color: #4d5a6b;
  font-size: 18px;
  line-height: 1.6;
}

.pending-payment-meta {
  width: min(420px, 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px;
  border-radius: 12px;
  background: #fff;
}

.pending-payment-meta span {
  color: var(--sf-muted);
  font-weight: 800;
}

.pending-payment-meta strong {
  color: var(--sf-primary);
  font-size: 24px;
}

.pending-payment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.pending-payment-actions .sf-button {
  min-width: 210px;
  min-height: 54px;
}

.order-summary {
  position: sticky;
  top: 94px;
  background: #fff;
  box-shadow: var(--sf-shadow-soft);
}

.summary-items {
  display: grid;
  gap: 18px;
}

.summary-items article {
  display: grid;
  grid-template-columns: 84px 1fr auto;
  gap: 16px;
  align-items: center;
}

.summary-img {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

.summary-img img {
  width: 84px;
  height: 84px;
  object-fit: cover;
}

.summary-img span {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--sf-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
}

.summary-items strong,
.summary-items small {
  display: block;
}

.summary-items small {
  margin-top: 6px;
  color: var(--sf-muted);
}

.coupon-row {
  display: grid;
  grid-template-columns: 1fr 110px;
  gap: 10px;
  margin: 26px 0;
}

.coupon-row button {
  border: none;
  border-radius: 8px;
  background: #dce8f7;
  font-weight: 800;
}

.coupon-row button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.coupon-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: -16px 0 22px;
  color: var(--sf-primary);
  font-weight: 800;
}

.coupon-state button {
  border: none;
  background: transparent;
  color: #6b7280;
  font-weight: 800;
  text-decoration: underline;
}

.order-summary dl {
  margin: 0;
  padding: 22px 0;
  border-top: 1px solid var(--sf-line);
  border-bottom: 1px solid var(--sf-line);
  display: grid;
  gap: 14px;
}

.order-summary dl div,
.total-line {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.order-summary dd {
  margin: 0;
  font-weight: 800;
}

.total-line {
  align-items: end;
  margin: 22px 0 26px;
}

.total-line strong {
  color: var(--sf-primary);
  font-size: 28px;
}

.place-order {
  width: 100%;
  min-height: 64px;
  font-size: 20px;
}

.place-order:disabled,
.checkout-mobile-bar button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.checkout-error {
  margin: 0 0 16px;
  color: var(--sf-danger);
  font-weight: 800;
}

.secure-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--sf-muted);
}

.checkout-mobile-bar {
  display: none;
}

@media (max-width: 1000px) {
  .checkout-shell {
    grid-template-columns: 1fr;
  }

  .order-summary {
    position: static;
  }
}

@media (max-width: 768px) {
  .checkout-page {
    padding-bottom: 140px;
  }

  .checkout-top {
    display: none;
  }

  .mobile-checkout-head {
    display: grid;
    grid-template-columns: 42px 1fr 42px;
    align-items: center;
    height: 72px;
    padding: 0 18px;
  }

  .mobile-checkout-head h1 {
    margin: 0;
    text-align: center;
    font-size: 22px;
  }

  .checkout-shell {
    width: calc(100% - 36px);
    gap: 18px;
  }

  .checkout-card {
    padding: 24px;
    border-radius: 16px;
  }

  .order-summary {
    display: none;
  }

  .form-grid,
  .customer-grid {
    grid-template-columns: 1fr;
  }

  .card-heading {
    align-items: start;
  }

  .checkout-card h2 {
    font-size: 22px;
  }

  .choice-list label {
    min-height: 82px;
  }

  .checkout-mobile-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 74px;
    z-index: 45;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 12px;
    padding: 18px 22px;
    background: #fff;
    border-top: 1px solid var(--sf-line);
  }

  .checkout-mobile-bar span {
    color: var(--sf-muted);
  }

  .checkout-mobile-bar strong {
    color: var(--sf-primary);
    font-size: 24px;
    justify-self: end;
  }

  .checkout-mobile-bar button {
    grid-column: 1 / -1;
    height: 58px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--sf-primary), var(--sf-accent));
    color: #fff;
    font-size: 19px;
    font-weight: 900;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
}
</style>
