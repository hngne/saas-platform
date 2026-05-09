<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Home,
  MapPin,
  Package,
  Truck,
} from "lucide-vue-next";
import {
  checkoutApi,
  findCustomerReview,
  getApiErrorMessage,
  reviewApi,
  type CustomerOrder,
  type ProductReview,
} from "@/api/customer";
import CustomerAccountSidebar from "@/components/CustomerAccountSidebar.vue";
import { formatVnd } from "@/data/storefront";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";
import { useUiStore } from "@/stores/ui.store";

const route = useRoute();
const auth = useCustomerAuthStore();
const ui = useUiStore();
const order = ref<CustomerOrder | null>(null);
const loading = ref(false);
const errorMessage = ref("");
const retryingPayment = ref(false);
const confirmingReceived = ref(false);
const reviewByItemId = ref<Record<string, ProductReview | null>>({});
const orderId = computed(() => String(route.params.id || ""));
const displayName = computed(() => auth.user?.name || order.value?.receiverName || "Khách hàng");

const statusRank: Record<string, number> = {
  PENDING: 0,
  PROCESSING: 2,
  CONFIRMED: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  COMPLETED: 4,
  CANCELLED: -1,
};

const currentRank = computed(() => statusRank[order.value?.status || "PENDING"] ?? 0);
const isCancelled = computed(() => order.value?.status === "CANCELLED");
const displayCode = computed(() => order.value?.code || `#${orderId.value}`);
const canRetryPayment = computed(
  () =>
    order.value?.paymentMethod === "VNPAY" &&
    order.value.status !== "CANCELLED" &&
    ["PENDING", "FAILED"].includes(order.value.paymentStatus),
);
const isPickup = computed(() => !!order.value?.pickupStore);
const canConfirmReceived = computed(() => !isPickup.value && order.value?.status === "SHIPPED");
const canReview = computed(() => ["DELIVERED", "COMPLETED"].includes(order.value?.status || ""));

const deliverySteps = computed(() => [
  {
    label: "Đã đặt hàng",
    time: order.value?.date || "",
    icon: Check,
    done: !isCancelled.value,
  },
  {
    label: "Thanh toán",
    time: order.value?.paymentStatusLabel || "",
    icon: CreditCard,
    done: order.value?.paymentStatus === "PAID",
  },
  {
    label: "Đã xác nhận",
    time: "",
    icon: Package,
    done: currentRank.value >= 2,
    active: currentRank.value === 2,
  },
  {
    label: "Đang giao",
    time: "",
    icon: Truck,
    done: currentRank.value >= 3,
    active: currentRank.value === 3,
  },
  {
    label: "Đã giao",
    time: "",
    icon: Home,
    done: currentRank.value >= 4,
    active: currentRank.value === 4,
  },
]);

const pickupRank = computed(() => {
  const ranks: Record<string, number> = {
    PENDING: 0, PROCESSING: 2, CONFIRMED: 2, DELIVERED: 3, COMPLETED: 3, CANCELLED: -1,
  };
  return ranks[order.value?.status || "PENDING"] ?? 0;
});

const pickupStepsComputed = computed(() => [
  {
    label: "Đã đặt hàng",
    time: order.value?.date || "",
    icon: Check,
    done: !isCancelled.value,
  },
  {
    label: "Thanh toán",
    time: order.value?.paymentStatusLabel || "",
    icon: CreditCard,
    done: order.value?.paymentStatus === "PAID",
  },
  {
    label: "Đã nhận hàng",
    time: "",
    icon: Home,
    done: pickupRank.value >= 3,
    active: pickupRank.value === 2,
  },
]);

const steps = computed(() => isPickup.value ? pickupStepsComputed.value : deliverySteps.value);

const items = computed(() =>
  order.value?.items.length
    ? order.value.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        variant: item.variant,
        price: item.unitPrice,
        qty: item.quantity,
        image: item.image,
      }))
    : [],
);

const subtotal = computed(() =>
  order.value?.subtotal || items.value.reduce((sum, item) => sum + item.price * item.qty, 0),
);
const shippingFee = computed(() => order.value?.shippingFee || 0);
const discount = computed(() => order.value?.discount || 0);
const total = computed(() => order.value?.total || subtotal.value + shippingFee.value - discount.value);
const primaryReviewItem = computed(() => items.value[0] || null);
const primaryReview = computed(() =>
  primaryReviewItem.value ? reviewByItemId.value[primaryReviewItem.value.id] || null : null,
);

const loadOrder = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    order.value = await checkoutApi.getOrderById(orderId.value);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Chưa thể tải chi tiết đơn hàng.");
  } finally {
    loading.value = false;
  }
};

const loadItemReviews = async () => {
  if (!order.value?.id || !auth.user?.id || !canReview.value) {
    reviewByItemId.value = {};
    return;
  }

  const reviewEntries = await Promise.all(
    items.value.map(async (item) => {
      if (!item.productId) return [item.id, null] as const;

      const reviewResult = await reviewApi.getByProduct(item.productId).catch(() => null);
      const review = reviewResult
        ? findCustomerReview(reviewResult.data, {
            customerId: auth.user?.id,
            orderId: order.value?.id,
            productId: item.productId,
          })
        : null;

      return [item.id, review] as const;
    }),
  );

  reviewByItemId.value = Object.fromEntries(reviewEntries);
};

const retryPayment = async () => {
  if (!order.value?.id || retryingPayment.value) return;
  retryingPayment.value = true;
  try {
    const paymentUrl = await checkoutApi.createPaymentUrl(order.value.id);
    window.location.href = paymentUrl;
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Không thể tạo lại link thanh toán VNPay.");
  } finally {
    retryingPayment.value = false;
  }
};

const confirmReceived = async () => {
  if (!order.value?.id || confirmingReceived.value || order.value.status !== "SHIPPED") return;

  confirmingReceived.value = true;
  errorMessage.value = "";
  try {
    order.value = await checkoutApi.confirmReceived(order.value.id);
    ui.showToast(`Đã nhận hàng cho đơn ${order.value.code}.`);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Không thể cập nhật trạng thái nhận hàng lúc này.");
  } finally {
    confirmingReceived.value = false;
  }
};

onMounted(async () => {
  await auth.fetchProfile().catch(() => null);
  await loadOrder();
  await loadItemReviews();
});
</script>

<template>
  <section class="detail-page theme-editorial">
    <CustomerAccountSidebar />

    <main class="detail-main">
      <header class="mobile-head">
        <RouterLink to="/account/orders" aria-label="Quay lại">
          <ArrowLeft :size="24" />
        </RouterLink>
        <h1>Chi tiết đơn hàng</h1>
        <span></span>
      </header>

      <nav class="breadcrumb">
        <RouterLink to="/account">Tài khoản</RouterLink>
        <span>/</span>
        <RouterLink to="/account/orders">Đơn hàng</RouterLink>
        <span>/</span>
        <strong>{{ displayCode }}</strong>
      </nav>

      <section class="heading-row">
        <div>
          <h1>Đơn hàng {{ displayCode }}</h1>
        </div>

        <div class="heading-actions">
          <button
            v-if="canRetryPayment"
            type="button"
            class="retry-button"
            :disabled="retryingPayment"
            @click="retryPayment"
          >
            {{ retryingPayment ? "Đang chuyển..." : order?.paymentStatus === "FAILED" ? "Thanh toán lại" : "Thanh toán ngay" }}
          </button>
          <button
            v-if="canConfirmReceived"
            type="button"
            class="confirm-button"
            :disabled="confirmingReceived"
            @click="confirmReceived"
          >
            {{ confirmingReceived ? "Đang cập nhật..." : "Đã nhận hàng" }}
          </button>
          <RouterLink
            v-if="canReview && primaryReviewItem"
            :to="{ path: `/account/orders/${orderId}/review`, query: { itemId: primaryReviewItem.id } }"
            class="link-action"
          >
            {{ primaryReview ? "Xem đánh giá" : "Đánh giá" }}
          </RouterLink>
          <button type="button">Mua lại</button>
        </div>
      </section>

      <p v-if="errorMessage" class="state-card warning">{{ errorMessage }}</p>
      <p v-else-if="isPickup && !['DELIVERED', 'COMPLETED'].includes(order?.status || '')" class="state-card info">
        Đơn hàng sẽ được xác nhận khi bạn đến nhận tại cửa hàng.
      </p>
      <p v-else-if="canConfirmReceived" class="state-card info">
        Nếu bạn đã nhận được hàng, hãy xác nhận để đơn được ghi nhận là đã giao.
      </p>

      <section v-if="order" class="mobile-status-card" :class="{ cancelled: isCancelled }">
        <Truck :size="34" />
        <h2>{{ order.statusLabel }}</h2>
        <p>Thanh toán: <strong>{{ order.paymentStatusLabel }}</strong></p>
        <span>Mã đơn: {{ displayCode }}</span>
      </section>

      <section v-if="order" class="tracking-panel" :class="{ cancelled: isCancelled }" :style="{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }">
        <article v-for="step in steps" :key="step.label" :class="{ done: step.done, active: step.active }">
          <span><component :is="step.icon" :size="22" /></span>
          <strong>{{ step.label }}</strong>
          <small>{{ step.time }}</small>
        </article>
      </section>

      <section v-if="order" class="info-grid">
        <article v-if="!isPickup">
          <h2><MapPin :size="18" /> Địa chỉ nhận hàng</h2>
          <p>
            <strong>{{ order.receiverName || displayName }}</strong>
            {{ order.receiverPhone || "Đang cập nhật" }}<br />
            {{ order.shippingAddress || "Chưa có địa chỉ giao hàng cho đơn này." }}
          </p>
        </article>

        <article v-if="isPickup">
          <h2><MapPin :size="18" /> Cửa hàng nhận hàng</h2>
          <p>
            <strong>{{ order.pickupStore?.name || 'Cửa hàng' }}</strong>
            {{ order.pickupStore?.address || 'Chưa có địa chỉ cửa hàng' }}
          </p>
        </article>

        <article>
          <h2><CreditCard :size="18" /> Phương thức thanh toán</h2>
          <p>
            <strong>{{ order.paymentMethod || "VNPay" }}</strong>
            Mã giao dịch: {{ order.transactionNo || "Đang cập nhật" }}
            <em>{{ order.paymentStatusLabel }}</em>
          </p>
        </article>

        <article>
          <h2><Truck :size="18" /> Hình thức nhận hàng</h2>
          <p>
            <strong>
              {{ order.shippingMethod?.name || (order.pickupStore ? "Nhận tại cửa hàng" : "Giao hàng tiêu chuẩn") }}
            </strong>
            {{ order.pickupStore?.name || order.shippingMethod?.description || "" }}
          </p>
        </article>

        <aside>
          <h2>Tóm tắt đơn hàng</h2>
          <dl>
            <div><dt>Tạm tính</dt><dd>{{ formatVnd(subtotal) }}</dd></div>
            <div><dt>Phí vận chuyển</dt><dd>{{ formatVnd(shippingFee) }}</dd></div>
            <div><dt>Giảm giá</dt><dd>- {{ formatVnd(discount) }}</dd></div>
          </dl>
          <div class="total"><span>Tổng cộng</span><strong>{{ formatVnd(total) }}</strong></div>
        </aside>
      </section>

      <section v-if="order" class="items-panel">
        <h2>Sản phẩm trong đơn</h2>
        <article v-for="item in items" :key="`${item.name}-${item.variant}`">
          <img :src="item.image" :alt="item.name" />
          <div>
            <strong>{{ item.name }}</strong>
            <span>{{ item.variant }}</span>
            <RouterLink
              v-if="canReview && order"
              :to="{ path: `/account/orders/${order.id}/review`, query: { itemId: item.id } }"
              class="item-review-link"
            >
              {{ reviewByItemId[item.id] ? "Xem đánh giá" : "Đánh giá sản phẩm" }}
            </RouterLink>
          </div>
          <p>{{ formatVnd(item.price) }} <small>SL: {{ item.qty }}</small></p>
        </article>
        <p v-if="!items.length" class="items-empty">
          Đơn hàng này chưa có dòng sản phẩm nào để hiển thị.
        </p>
      </section>
    </main>
  </section>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 320px 1fr;
  background: var(--sf-bg);
}

.detail-main {
  width: min(1180px, calc(100% - 64px));
  margin: 0 auto;
  padding: 42px 0 80px;
}

.mobile-head {
  display: none;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #475467;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.breadcrumb a {
  color: #475467;
}

.breadcrumb strong {
  color: var(--sf-primary);
}

.heading-row {
  display: flex;
  justify-content: space-between;
  gap: 26px;
  margin: 26px 0 28px;
}

.heading-row h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.heading-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.link-action {
  color: var(--sf-primary);
  font-weight: 900;
}

.heading-actions button {
  min-width: 160px;
  height: 48px;
  border: none;
  border-radius: 8px;
  background: var(--sf-primary);
  color: #fff;
  font-size: 17px;
  font-weight: 900;
}

.confirm-button {
  background: #111827;
}

.retry-button:disabled,
.confirm-button:disabled {
  opacity: 0.7;
}

.state-card {
  margin: 0 0 22px;
  padding: 16px 18px;
  border-radius: 10px;
  background: #fff;
  font-weight: 800;
}

.state-card.warning {
  color: var(--sf-primary);
}

.state-card.info {
  color: #155ad1;
}

.tracking-panel,
.info-grid article,
.info-grid aside,
.items-panel,
.mobile-status-card {
  border-radius: 14px;
  background: #edf4fd;
}

.tracking-panel {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 42px;
  padding: 36px 42px;
}

.tracking-panel article {
  text-align: center;
  color: #98a2b3;
}

.tracking-panel span {
  width: 58px;
  height: 58px;
  margin: 0 auto 14px;
  border-radius: 999px;
  background: #dce8f7;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tracking-panel .done span,
.tracking-panel .active span {
  background: var(--sf-primary);
  color: #fff;
}

.tracking-panel .active span {
  border: 2px solid var(--sf-primary);
  background: #fff;
  color: var(--sf-primary);
}

.tracking-panel.cancelled .done span,
.tracking-panel.cancelled .active span {
  background: #98a2b3;
}

.tracking-panel strong,
.tracking-panel small {
  display: block;
}

.tracking-panel strong {
  color: var(--sf-ink);
  font-size: 17px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 360px;
  gap: 28px;
}

.info-grid article,
.info-grid aside {
  padding: 34px;
}

.info-grid article:nth-child(3) {
  grid-column: 2;
}

.info-grid aside {
  grid-column: 3;
  grid-row: 1 / span 2;
}

.info-grid h2 {
  margin: 0 0 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.info-grid p {
  margin: 0;
  color: #475467;
  line-height: 1.65;
  font-size: 17px;
}

.info-grid p strong {
  display: block;
  color: var(--sf-ink);
  font-size: 20px;
}

.info-grid em {
  display: inline-flex;
  margin-top: 12px;
  padding: 7px 14px;
  border-radius: 999px;
  background: #fff;
  color: var(--sf-primary);
  font-style: normal;
  font-weight: 900;
}

dl {
  display: grid;
  gap: 18px;
  margin: 0;
  padding-bottom: 28px;
  border-bottom: 1px solid #dce8f7;
}

dl div,
.total {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

dd {
  margin: 0;
  font-weight: 800;
}

.total {
  margin-top: 28px;
  align-items: center;
}

.total strong {
  color: var(--sf-primary);
  font-size: 28px;
}

.items-panel {
  width: calc(100% - 390px);
  margin-top: 28px;
  padding: 36px;
}

.items-panel h2 {
  margin: 0 0 26px;
}

.items-panel article {
  display: grid;
  grid-template-columns: 118px 1fr auto;
  gap: 28px;
  align-items: center;
  padding: 22px 0;
  border-top: 1px solid #dce8f7;
}

.items-panel img {
  width: 112px;
  height: 112px;
  border-radius: 6px;
  object-fit: cover;
}

.items-panel strong,
.items-panel span,
.items-panel small {
  display: block;
}

.items-panel strong {
  font-size: 21px;
}

.items-panel span,
.items-panel small {
  color: #667085;
}

.item-review-link {
  display: inline-flex;
  margin-top: 10px;
  color: var(--sf-primary);
  font-weight: 800;
}

.items-panel p {
  text-align: right;
  font-size: 21px;
  font-weight: 800;
}

.items-empty {
  margin: 0;
  padding-top: 22px;
  border-top: 1px solid #dce8f7;
  color: var(--sf-muted);
}

.mobile-status-card {
  display: none;
}

@media (max-width: 980px) {
  .detail-page {
    display: block;
  }

  .detail-main {
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

  .breadcrumb,
  .heading-row {
    display: none;
  }

  .mobile-status-card {
    display: block;
    margin-bottom: 22px;
    padding: 28px;
    border-radius: 12px;
    background: #fff;
    text-align: center;
  }

  .mobile-status-card svg {
    width: 62px;
    height: 62px;
    padding: 16px;
    border-radius: 999px;
    background: #ffe2d4;
    color: var(--sf-primary);
  }

  .mobile-status-card.cancelled svg {
    background: #f2f4f7;
    color: #667085;
  }

  .mobile-status-card h2 {
    margin: 18px 0 10px;
    font-size: 24px;
  }

  .mobile-status-card p,
  .mobile-status-card span {
    display: block;
    margin: 0;
    color: #475467;
  }

  .tracking-panel {
    grid-template-columns: 1fr;
    gap: 0;
    margin-bottom: 22px;
    padding: 18px 24px;
    border-radius: 12px;
    background: #fff;
  }

  .tracking-panel article {
    min-height: 74px;
    display: grid;
    grid-template-columns: 52px 1fr;
    align-items: center;
    gap: 14px;
    text-align: left;
    border-bottom: 1px solid var(--sf-line);
  }

  .tracking-panel article:last-child {
    border-bottom: none;
  }

  .tracking-panel span {
    width: 42px;
    height: 42px;
    margin: 0;
  }

  .tracking-panel small {
    grid-column: 2;
    margin-top: -14px;
  }

  .info-grid {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .items-panel,
  .info-grid aside,
  .info-grid article {
    width: 100%;
    margin: 0;
    padding: 24px;
    border-radius: 12px;
    background: #fff;
  }

  .items-panel {
    order: -1;
  }

  .items-panel article {
    grid-template-columns: 78px 1fr auto;
    gap: 14px;
    padding: 14px 0;
  }

  .items-panel img {
    width: 76px;
    height: 76px;
  }

  .items-panel strong {
    font-size: 15px;
  }

  .items-panel p {
    font-size: 14px;
  }
}
</style>
