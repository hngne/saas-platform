<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Package, Search } from "lucide-vue-next";
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

const tabs = ["Tất cả", "Chờ thanh toán", "Đang xử lý", "Đang giao", "Đã giao", "Đã hủy"];
const tabToStatus: Record<string, string[] | null> = {
  "Tất cả": null,
  "Chờ thanh toán": ["PENDING"],
  "Đang xử lý": ["PROCESSING"],
  "Đang giao": ["SHIPPED"],
  "Đã giao": ["DELIVERED", "COMPLETED"],
  "Đã hủy": ["CANCELLED"],
};

const auth = useCustomerAuthStore();
const activeTab = ref("Tất cả");
const search = ref("");
const loading = ref(false);
const errorMessage = ref("");
const orders = ref<CustomerOrder[]>([]);
const reviewByOrderId = ref<Record<string, ProductReview | null>>({});

const filteredOrders = computed(() =>
  orders.value.filter((order) => {
    const expectedStatus = tabToStatus[activeTab.value];
    const matchesTab = !expectedStatus || expectedStatus.includes(order.status);
    const keyword = search.value.trim().toLowerCase();
    const haystack = `${order.code} ${order.items.map((item) => item.name).join(" ")}`.toLowerCase();
    const matchesSearch = !keyword || haystack.includes(keyword);
    return matchesTab && matchesSearch;
  }),
);

const toneByStatus = (status: string) => {
  if (status === "COMPLETED" || status === "DELIVERED") return "done";
  if (status === "SHIPPED") return "shipping";
  if (status === "CANCELLED") return "cancelled";
  return "pending";
};

const canPayNow = (order: CustomerOrder) =>
  order.status !== "CANCELLED" &&
  ["PENDING", "FAILED"].includes(order.paymentStatus) &&
  order.paymentMethod === "VNPAY";

const getOrderReview = (order: CustomerOrder) => reviewByOrderId.value[order.id] || null;

const getPrimaryActionLabel = (order: CustomerOrder) => {
  if (order.status === "SHIPPED") return "Đã nhận hàng";
  if (["DELIVERED", "COMPLETED"].includes(order.status)) return getOrderReview(order) ? "Xem đánh giá" : "Đánh giá";
  if (order.status === "CANCELLED") return "Xem chi tiết";
  if (order.paymentMethod === "VNPAY" && order.paymentStatus === "FAILED") return "Thanh toán lại";
  if (canPayNow(order)) return "Thanh toán ngay";
  return "Theo dõi";
};

const getPrimaryActionTarget = (order: CustomerOrder) => {
  if (["DELIVERED", "COMPLETED"].includes(order.status)) {
    const firstItem = order.items[0];
    return {
      path: `/account/orders/${order.id}/review`,
      query: firstItem ? { itemId: firstItem.id } : {},
    };
  }
  return `/account/orders/${order.id}`;
};

const loadOrders = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await checkoutApi.getOrders({ limit: 30 });
    orders.value = result.data;
  } catch (error) {
    orders.value = [];
    errorMessage.value = getApiErrorMessage(error, "Chưa thể tải đơn hàng của khách hàng hiện tại.");
  } finally {
    loading.value = false;
  }
};

const loadReviewState = async () => {
  if (!auth.user?.id) {
    reviewByOrderId.value = {};
    return;
  }

  const reviewEntries = await Promise.all(
    orders.value.map(async (order) => {
      if (!["DELIVERED", "COMPLETED"].includes(order.status)) return [order.id, null] as const;

      const firstItem = order.items[0];
      if (!firstItem?.productId) return [order.id, null] as const;

      const reviewResult = await reviewApi.getByProduct(firstItem.productId).catch(() => null);
      const review = reviewResult
        ? findCustomerReview(reviewResult.data, {
            customerId: auth.user?.id,
            orderId: order.id,
            productId: firstItem.productId,
          })
        : null;

      return [order.id, review] as const;
    }),
  );

  reviewByOrderId.value = Object.fromEntries(reviewEntries);
};

onMounted(async () => {
  await auth.fetchProfile().catch(() => null);
  await loadOrders();
  await loadReviewState();
});
</script>

<template>
  <section class="orders-page theme-editorial">
    <CustomerAccountSidebar />

    <main class="orders-main">
      <header class="orders-heading">
        <div>
          <h1>Đơn hàng của tôi</h1>
        </div>
        <label class="search-box">
          <Search :size="18" />
          <input v-model="search" placeholder="Tìm theo mã đơn hoặc tên sản phẩm..." />
        </label>
      </header>

      <nav class="order-tabs">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </nav>

      <p v-if="loading" class="orders-state">Đang tải đơn hàng...</p>
      <p v-else-if="errorMessage" class="orders-state warning">{{ errorMessage }}</p>
      <p v-else-if="!filteredOrders.length" class="orders-state">
        Không có đơn hàng nào khớp bộ lọc hiện tại.
      </p>

      <section v-else class="order-list">
        <article v-for="order in filteredOrders" :key="order.id">
          <header>
            <h2>{{ order.code }} <span>•</span> {{ order.date }}</h2>
            <b :class="toneByStatus(order.status)">{{ order.statusLabel }}</b>
          </header>
          <div class="order-body">
            <div v-if="order.items.length" class="order-images">
              <img v-for="item in order.items.slice(0, 3)" :key="item.id" :src="item.image" :alt="item.name" />
            </div>
            <div v-else class="order-images empty">
              <Package :size="24" />
            </div>
            <div class="order-info">
              <h3>{{ order.items.map((item) => item.name).join(", ") || "Đơn hàng" }}</h3>
              <p>{{ order.items.reduce((sum, item) => sum + item.quantity, 0) }} sản phẩm</p>
              <small class="payment-line"><span>Thanh toán:</span> {{ order.paymentStatusLabel }}</small>
            </div>
            <div class="order-total">
              <span>Tổng tiền</span>
              <strong>{{ formatVnd(order.total) }}</strong>
              <div>
                <RouterLink :to="`/account/orders/${order.id}`" class="detail">Xem chi tiết</RouterLink>
                <RouterLink :to="getPrimaryActionTarget(order)" class="primary">
                  {{ getPrimaryActionLabel(order) }}
                </RouterLink>
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>
  </section>
</template>

<style scoped>
.orders-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 320px 1fr;
  background: var(--sf-bg);
}

.orders-main {
  width: min(1120px, calc(100% - 64px));
  margin: 0 auto;
  padding: 42px 0 64px;
}

.orders-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 26px;
}

.orders-heading h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1;
  letter-spacing: -0.05em;
}

.search-box {
  width: 360px;
  height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid var(--sf-line);
  background: #fff;
}

.search-box input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
}

.order-tabs {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  margin-bottom: 24px;
}

.order-tabs button {
  flex: 0 0 auto;
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid var(--sf-line);
  border-radius: 999px;
  background: #fff;
  font-weight: 800;
}

.order-tabs button.active {
  border-color: var(--sf-primary);
  background: var(--sf-primary);
  color: #fff;
}

.orders-state {
  margin: 0;
  color: var(--sf-muted);
  font-weight: 700;
}

.orders-state.warning {
  color: var(--sf-primary);
}

.order-list {
  display: grid;
  gap: 18px;
  margin-top: 20px;
}

.order-list article {
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--sf-shadow-soft);
  overflow: hidden;
}

.order-list header {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  background: #fbfdff;
}

.order-list h2 {
  margin: 0;
  font-size: 22px;
}

.order-list h2 span {
  color: #d7bfb0;
  margin: 0 10px;
}

.order-list b {
  padding: 8px 14px;
  border-radius: 999px;
}

.pending {
  background: #fff1e8;
  color: var(--sf-primary);
}

.shipping {
  background: #e4f4ff;
  color: #155ad1;
}

.done {
  background: #e9f8f1;
  color: #16865a;
}

.cancelled {
  background: #f2f4f7;
  color: #667085;
}

.order-body {
  display: grid;
  grid-template-columns: 180px 1fr 260px;
  gap: 20px;
  align-items: center;
  padding: 24px;
}

.order-images {
  display: flex;
}

.order-images img {
  width: 78px;
  height: 78px;
  margin-right: -10px;
  border-radius: 10px;
  border: 2px solid #fff;
  object-fit: cover;
}

.order-images.empty {
  width: 78px;
  height: 78px;
  border-radius: 10px;
  background: #edf4fd;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--sf-primary);
}

.order-info h3 {
  margin: 0 0 10px;
  font-size: 20px;
}

.order-info p,
.order-info small {
  display: block;
  margin: 0;
  color: var(--sf-muted);
}

.order-info small {
  margin-top: 8px;
  font-weight: 800;
}

.payment-line span {
  color: var(--sf-muted);
  font-weight: 700;
}

.order-total {
  text-align: right;
}

.order-total span {
  display: block;
  color: var(--sf-muted);
  text-transform: uppercase;
}

.order-total strong {
  display: block;
  margin: 8px 0 16px;
  color: var(--sf-primary);
  font-size: 28px;
}

.order-total div {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.detail,
.primary {
  min-width: 130px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-weight: 800;
}

.detail {
  border: 1px solid var(--sf-line);
  color: var(--sf-primary);
}

.primary {
  background: var(--sf-primary);
  color: #fff;
}

@media (max-width: 900px) {
  .orders-page {
    display: block;
  }

  .orders-main {
    width: calc(100% - 36px);
    padding-top: 24px;
  }

  .orders-heading {
    display: block;
  }

  .search-box {
    width: 100%;
    margin-top: 16px;
  }

  .order-body {
    grid-template-columns: 1fr;
  }

  .order-total {
    text-align: left;
  }

  .order-total div {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
