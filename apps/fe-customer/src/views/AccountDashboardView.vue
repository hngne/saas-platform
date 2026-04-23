<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Bell, CircleHelp, MapPin, Package, Search, ShoppingBag, User } from "lucide-vue-next";
import { checkoutApi, notificationApi, type CustomerOrder } from "@/api/customer";
import CustomerAccountSidebar from "@/components/CustomerAccountSidebar.vue";
import { formatVnd } from "@/data/storefront";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";
import { getStoreDisplayName } from "@/utils/storefront-brand";

const auth = useCustomerAuthStore();
const apiOrders = ref<CustomerOrder[]>([]);
const unreadCount = ref(0);
const displayStoreName = computed(getStoreDisplayName);

const recentOrders = computed(() =>
  apiOrders.value.slice(0, 3).map((order) => ({
    id: order.code,
    rawId: order.id,
    date: order.date,
    name: order.items.map((item) => item.name).join(", ") || "Đơn hàng",
    status: order.statusLabel,
    action:
      ["DELIVERED", "COMPLETED"].includes(order.status)
        ? "Đánh giá"
        : order.status === "SHIPPED"
          ? "Đã nhận hàng"
          : order.status !== "CANCELLED" &&
              ["PENDING", "FAILED"].includes(order.paymentStatus) &&
              order.paymentMethod === "VNPAY"
            ? order.paymentStatus === "FAILED"
              ? "Thanh toán lại"
              : "Thanh toán ngay"
            : "Theo dõi",
    price: order.total,
    image: order.items[0]?.image || "",
  })),
);

onMounted(async () => {
  await auth.fetchProfile().catch(() => null);
  const [ordersResult, notificationsResult] = await Promise.allSettled([
    checkoutApi.getOrders({ limit: 3 }),
    notificationApi.getAll({ limit: 5 }),
  ]);

  if (ordersResult.status === "fulfilled") apiOrders.value = ordersResult.value.data;
  if (notificationsResult.status === "fulfilled") unreadCount.value = notificationsResult.value.unread || 0;
});
</script>

<template>
  <section class="account-page theme-editorial">
    <CustomerAccountSidebar />

    <main class="account-main">
      <header class="account-top">
        <RouterLink to="/" class="mobile-brand">{{ displayStoreName }}</RouterLink>
        <div class="top-actions">
          <Search :size="22" />
          <RouterLink to="/account/notifications" class="icon-link">
            <Bell :size="22" />
            <em v-if="unreadCount">{{ unreadCount }}</em>
          </RouterLink>
          <RouterLink to="/cart" class="icon-link"><ShoppingBag :size="22" /></RouterLink>
        </div>
      </header>

      <section class="account-heading">
        <h1>Tổng quan tài khoản</h1>
      </section>

      <div class="dashboard-grid">
        <section class="panel recent-panel">
          <div class="panel-title">
            <h2>Đơn hàng gần đây</h2>
            <RouterLink to="/account/orders">Xem tất cả</RouterLink>
          </div>
          <div v-if="recentOrders.length" class="order-list">
            <article v-for="order in recentOrders" :key="order.rawId">
              <img v-if="order.image" :src="order.image" :alt="order.name" />
              <div v-else class="order-image-fallback"><Package :size="24" /></div>
              <div>
                <span>{{ order.id }} • {{ order.date }}</span>
                <strong>{{ order.name }}</strong>
                <small>{{ order.status }}</small>
              </div>
              <div class="order-side">
                <b>{{ formatVnd(order.price) }}</b>
                <RouterLink :to="`/account/orders/${order.rawId}`">{{ order.action }}</RouterLink>
              </div>
            </article>
          </div>
          <p v-else class="empty-note">Bạn chưa có đơn hàng nào trong shop này.</p>
        </section>

        <aside class="panel default-address">
          <div class="panel-title">
            <h2>Địa chỉ mặc định</h2>
            <RouterLink to="/account/addresses">Quản lý</RouterLink>
          </div>
          <div class="address-card">
            <MapPin :size="22" />
            <p v-if="auth.defaultAddress">
              <strong>{{ auth.defaultAddress.receiver_name }}</strong>
              {{ auth.defaultAddress.phone }}<br />
              {{ auth.defaultAddress.address_detail }}<br />
              {{ auth.defaultAddress.ward }}, {{ auth.defaultAddress.district }}<br />
              {{ auth.defaultAddress.province }}
            </p>
            <p v-else>
              <strong>Chưa có địa chỉ</strong>
              Thêm địa chỉ nhận hàng để checkout nhanh hơn.
            </p>
          </div>
        </aside>

        <section class="panel quick-panel">
          <h2>Truy cập nhanh</h2>
          <div class="quick-grid">
            <RouterLink to="/account/profile"><User :size="28" /><b>Hồ sơ</b></RouterLink>
            <RouterLink to="/account/orders"><Package :size="28" /><b>Đơn hàng</b></RouterLink>
            <RouterLink to="/account/notifications">
              <Bell :size="28" />
              <span v-if="unreadCount" class="dot">{{ unreadCount }}</span>
              <b>Thông báo</b>
            </RouterLink>
            <RouterLink to="/support"><CircleHelp :size="28" /><b>Hỗ trợ</b></RouterLink>
          </div>
        </section>
      </div>
    </main>
  </section>
</template>

<style scoped>
.account-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 320px 1fr;
  background: var(--sf-bg);
}

.mobile-brand {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.order-image-fallback {
  width: 64px;
  height: 64px;
  border-radius: 999px;
}

.order-image-fallback {
  background: #dce8f7;
  color: var(--sf-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}

.account-top {
  height: 72px;
  display: none;
  align-items: center;
  justify-content: flex-end;
  padding: 0 28px;
  background: #fff;
  border-bottom: 1px solid var(--sf-line);
}

.mobile-brand {
  display: none;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 18px;
}

.icon-link {
  position: relative;
  color: inherit;
}

.icon-link em {
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--sf-primary);
  color: #fff;
  font-style: normal;
  font-size: 11px;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.account-main {
  padding-bottom: 48px;
}

.account-heading,
.dashboard-grid {
  width: min(1120px, calc(100% - 64px));
  margin: 0 auto;
}

.account-heading {
  padding: 42px 0 28px;
}

.account-heading h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1;
  letter-spacing: -0.05em;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
}

.panel {
  border-radius: 16px;
  background: #edf4fd;
  padding: 28px;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.panel h2 {
  margin: 0;
  font-size: 26px;
  letter-spacing: -0.04em;
}

.panel-title a {
  color: var(--sf-primary);
  font-weight: 800;
}

.order-list {
  display: grid;
  gap: 16px;
}

.order-list article {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 18px;
  border-radius: 12px;
  background: #fff;
}

.order-list img {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
}

.order-list span,
.order-list small {
  display: block;
  color: var(--sf-muted);
}

.order-list strong {
  display: block;
  margin: 6px 0;
}

.order-side {
  text-align: right;
}

.order-side b {
  display: block;
  margin-bottom: 10px;
  font-size: 22px;
}

.order-side a {
  color: var(--sf-primary);
  font-weight: 800;
}

.address-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  padding: 20px;
  border-radius: 12px;
  background: #fff;
}

.address-card p {
  margin: 0;
  line-height: 1.6;
  color: #5c4037;
}

.address-card strong {
  display: block;
  color: var(--sf-ink);
  margin-bottom: 6px;
}

.quick-panel {
  grid-column: 1 / -1;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.quick-grid a {
  position: relative;
  min-height: 132px;
  border-radius: 12px;
  background: #fff;
  display: grid;
  place-items: center;
  gap: 10px;
}

.quick-grid b {
  font-size: 16px;
}

.dot {
  position: absolute;
  top: 18px;
  right: 18px;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--sf-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.empty-note {
  margin: 0;
  color: var(--sf-muted);
  font-weight: 700;
}

@media (max-width: 980px) {
  .account-page {
    display: block;
  }

  .account-top {
    display: flex;
    justify-content: space-between;
  }

  .mobile-brand {
    display: block;
  }

  .account-heading,
  .dashboard-grid {
    width: calc(100% - 36px);
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .order-list article {
    grid-template-columns: 64px 1fr;
  }

  .order-side {
    grid-column: 1 / -1;
    text-align: left;
    padding-top: 10px;
    border-top: 1px solid var(--sf-line);
  }
}
</style>
