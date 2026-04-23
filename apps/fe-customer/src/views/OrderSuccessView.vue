<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { Check, Mail, ReceiptText } from "lucide-vue-next";
import { checkoutApi, type CustomerOrder } from "@/api/customer";
import { formatVnd } from "@/data/storefront";
import { useCartStore } from "@/stores/cart.store";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";
import { clearPendingVnpayOrder } from "@/utils/pending-payment";
import { getStoreDisplayName } from "@/utils/storefront-brand";

const route = useRoute();
const cart = useCartStore();
const auth = useCustomerAuthStore();
const displayStoreName = computed(getStoreDisplayName);
const retryingPayment = ref(false);

const lastOrder = computed<CustomerOrder | null>(() => {
  const raw = sessionStorage.getItem("last_customer_order");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CustomerOrder;
  } catch {
    return null;
  }
});

const paymentCode = computed(() => String(route.query.code || ""));
const paymentValid = computed(() => String(route.query.valid || "") === "true");
const isPaymentReturn = computed(() => route.name === "payment-result");
const isPaymentOk = computed(() => !isPaymentReturn.value || (paymentValid.value && paymentCode.value === "00"));
const orderId = computed(() => String(route.query.order_id || lastOrder.value?.id || ""));
const orderCode = computed(() => lastOrder.value?.code || (orderId.value ? `#${orderId.value.slice(-8).toUpperCase()}` : "#ORD"));
const method = computed(() => String(route.query.method || lastOrder.value?.paymentMethod || "VNPAY"));
const total = computed(() => lastOrder.value?.total || 0);
const transactionRef = computed(() => String(route.query.ref || lastOrder.value?.transactionNo || ""));
const compactTransactionRef = computed(() => {
  const ref = transactionRef.value.trim();
  if (!ref) return "Đang cập nhật";
  if (ref.length <= 18) return ref;
  return `${ref.slice(0, 8)}...${ref.slice(-6)}`;
});
const canRetryPayment = computed(
  () => isPaymentReturn.value && !isPaymentOk.value && method.value === "VNPAY" && Boolean(orderId.value),
);

const retryPayment = async () => {
  if (!orderId.value || retryingPayment.value) return;
  retryingPayment.value = true;

  try {
    const paymentUrl = await checkoutApi.createPaymentUrl(orderId.value);
    window.location.href = paymentUrl;
  } finally {
    retryingPayment.value = false;
  }
};

onMounted(() => {
  if (isPaymentOk.value) {
    cart.clear();
    clearPendingVnpayOrder();
  }
});
</script>

<template>
  <section class="success-page theme-editorial">
    <header class="success-brand">{{ displayStoreName }}</header>

    <main class="success-card" aria-labelledby="success-title">
      <div class="success-mark" aria-hidden="true">
        <Check :size="42" />
      </div>

      <h1 id="success-title">{{ isPaymentOk ? "Đặt hàng thành công!" : "Thanh toán chưa hoàn tất" }}</h1>
      <p class="success-copy">
        {{ isPaymentOk ? `Cảm ơn bạn đã mua sắm tại ${displayStoreName}. Đơn hàng của bạn đang được xử lý.` : "VNPay chưa xác nhận thanh toán thành công. Bạn có thể kiểm tra lại đơn hàng trong tài khoản." }}
      </p>

      <section class="order-panel" aria-label="Thông tin đơn hàng">
        <div>
          <span>Mã đơn hàng</span>
          <strong>{{ orderCode }}</strong>
        </div>
        <div>
          <span>Mã giao dịch</span>
          <strong class="transaction-ref" :title="transactionRef || undefined">{{ compactTransactionRef }}</strong>
        </div>
        <div>
          <span>Phương thức</span>
          <strong>{{ method }}</strong>
        </div>
        <div>
          <span>Tổng tiền</span>
          <strong class="amount">{{ formatVnd(total) }}</strong>
        </div>
      </section>

      <section class="mail-note">
        <Mail :size="24" />
        <p>Chúng tôi sẽ gửi email xác nhận đơn hàng đến <strong>{{ auth.user?.email || "email của bạn" }}</strong></p>
      </section>

      <div class="success-actions">
        <RouterLink :to="orderId ? `/account/orders/${orderId}` : '/account/orders'" class="sf-button">
          <ReceiptText :size="20" />
          Xem chi tiết đơn hàng
        </RouterLink>
        <button v-if="canRetryPayment" type="button" class="sf-button" :disabled="retryingPayment" @click="retryPayment">
          {{ retryingPayment ? "Đang chuyển..." : "Thanh toán lại" }}
        </button>
        <RouterLink to="/products" class="sf-button ghost">Tiếp tục mua sắm</RouterLink>
      </div>
    </main>

    <footer class="success-footer">
      <strong>© 2024 {{ displayStoreName }}.</strong>
      <nav aria-label="Liên kết hỗ trợ">
        <a>Order Tracking</a>
        <a>Shipping & Returns</a>
        <a>Privacy Policy</a>
        <a>Contact</a>
      </nav>
    </footer>
  </section>
</template>

<style scoped>
.success-page {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 38px 48px 30px;
  background: var(--sf-bg);
  color: var(--sf-ink);
}

.success-brand {
  text-align: center;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.success-card {
  width: min(860px, 100%);
  align-self: center;
  justify-self: center;
  padding: 64px;
  border: 1px solid var(--sf-line);
  border-radius: 14px;
  background: #fff;
  box-shadow: var(--sf-shadow-card);
  text-align: center;
}

.success-mark {
  width: 124px;
  height: 124px;
  margin: 0 auto 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e9f5e9;
  color: #fff;
  box-shadow: 0 20px 50px rgba(33, 91, 43, 0.1);
}

.success-mark svg {
  width: 56px;
  height: 56px;
  padding: 12px;
  border-radius: 999px;
  background: #347d39;
}

h1 {
  margin: 0;
  font-size: clamp(34px, 5vw, 48px);
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.success-copy {
  width: min(560px, 100%);
  margin: 22px auto 46px;
  color: #5c4b43;
  font-size: 22px;
  line-height: 1.6;
}

.order-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin: 0 auto 36px;
  padding: 18px;
  border-radius: 16px;
  background: #edf4fd;
  text-align: left;
}

.order-panel > div {
  min-width: 0;
  padding: 18px;
  border-radius: 12px;
  background: #fff;
}

.order-panel span {
  display: block;
  margin-bottom: 10px;
  color: #5b4338;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.order-panel strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-panel .amount {
  color: var(--sf-primary);
  font-size: 24px;
}

.transaction-ref {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  letter-spacing: -0.02em;
}

.mail-note {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 18px;
  margin-bottom: 44px;
  padding: 20px 24px;
  border-radius: 8px;
  background: #edf4fd;
  color: #4d403a;
  text-align: left;
}

.mail-note svg {
  color: #0d678d;
}

.mail-note p {
  margin: 0;
  line-height: 1.5;
}

.success-actions {
  display: flex;
  justify-content: center;
  gap: 18px;
}

.success-actions .sf-button {
  min-width: 270px;
  min-height: 64px;
  font-size: 18px;
}

.success-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.success-footer nav {
  display: flex;
  gap: 28px;
  color: #64748b;
  text-decoration: underline;
  text-underline-offset: 6px;
}

@media (max-width: 768px) {
  .success-page {
    display: block;
    padding: 0 24px 48px;
  }

  .success-brand,
  .success-footer {
    display: none;
  }

  .success-card {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 56px 0;
    border: none;
    background: transparent;
    box-shadow: none;
  }

  .success-mark {
    width: 142px;
    height: 142px;
    margin-bottom: 56px;
    background: #fff;
  }

  .success-mark svg {
    background: var(--sf-primary);
  }

  .success-copy {
    margin: 20px auto 56px;
    font-size: 24px;
  }

  .order-panel {
    grid-template-columns: 1fr;
    gap: 26px;
    margin-bottom: 48px;
    padding: 40px 44px;
    border: 1px solid #f0ded4;
    border-radius: 14px;
    background: #fff;
  }

  .order-panel div {
    display: flex;
    justify-content: space-between;
    gap: 20px;
  }

  .order-panel div:nth-child(2),
  .mail-note {
    display: none;
  }

  .order-panel div:last-child {
    padding-top: 30px;
    border-top: 2px dashed #e7edf5;
  }

  .order-panel span {
    margin: 0;
    font-size: 17px;
  }

  .order-panel strong {
    font-size: 24px;
  }

  .order-panel .amount {
    font-size: 32px;
  }

  .success-actions {
    display: grid;
    gap: 26px;
  }

  .success-actions .sf-button {
    width: 100%;
    min-height: 70px;
    border-radius: 0;
  }

  .success-actions .ghost {
    border: none;
    background: transparent;
    color: var(--sf-primary);
    box-shadow: none;
  }
}
</style>
