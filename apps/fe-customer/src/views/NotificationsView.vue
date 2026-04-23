<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ArrowLeft, CreditCard, MessageSquare, Ticket, Truck } from "lucide-vue-next";
import { getApiErrorMessage, notificationApi, type NotificationItem } from "@/api/customer";
import CustomerAccountSidebar from "@/components/CustomerAccountSidebar.vue";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";

const auth = useCustomerAuthStore();
const notifications = ref<NotificationItem[]>([]);
const errorMessage = ref("");
const loading = ref(false);

const todayNotifications = computed(() =>
  notifications.value.filter((item) => {
    if (!item.createdAt) return false;
    const date = new Date(item.createdAt);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  }),
);

const olderNotifications = computed(() =>
  notifications.value.filter((item) => !todayNotifications.value.some((entry) => entry.id === item.id)),
);

const iconByType = (type?: string | null) => {
  if (type === "PAYMENT") return CreditCard;
  if (type === "VOUCHER" || type === "PROMOTION") return Ticket;
  if (type === "COMMENT" || type === "REVIEW") return MessageSquare;
  return Truck;
};

const loadNotifications = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await notificationApi.getAll();
    notifications.value = result.data;
  } catch (error) {
    notifications.value = [];
    errorMessage.value = getApiErrorMessage(error, "Chưa thể tải thông báo.");
  } finally {
    loading.value = false;
  }
};

const markAll = async () => {
  await notificationApi.markAllAsRead().catch(() => null);
  notifications.value = notifications.value.map((item) => ({ ...item, unread: false }));
};

const markRead = async (item: NotificationItem) => {
  if (!item.unread) return;
  await notificationApi.markAsRead(item.id).catch(() => null);
  notifications.value = notifications.value.map((entry) => (entry.id === item.id ? { ...entry, unread: false } : entry));
};

onMounted(async () => {
  await auth.fetchProfile().catch(() => null);
  await loadNotifications();
});
</script>

<template>
  <section class="notifications-page theme-editorial">
    <CustomerAccountSidebar />

    <header class="mobile-head">
      <RouterLink to="/account"><ArrowLeft :size="24" /></RouterLink>
      <h1>Thông báo</h1>
      <span></span>
    </header>

    <main class="notification-main">
      <header class="page-heading">
        <div>
          <h1>Thông báo</h1>
        </div>
        <button type="button" @click="markAll">Đánh dấu tất cả đã đọc</button>
      </header>

      <nav class="account-links">
        <RouterLink to="/account">Tổng quan</RouterLink>
        <RouterLink to="/account/profile">Hồ sơ</RouterLink>
        <RouterLink to="/account/addresses">Sổ địa chỉ</RouterLink>
        <RouterLink to="/account/orders">Đơn hàng</RouterLink>
        <RouterLink to="/account/notifications" class="active">Thông báo</RouterLink>
      </nav>

      <p v-if="loading" class="notification-state">Đang tải thông báo...</p>
      <p v-else-if="errorMessage" class="notification-state warning">{{ errorMessage }}</p>
      <p v-else-if="!notifications.length" class="notification-state">Bạn chưa có thông báo nào.</p>

      <section v-if="todayNotifications.length" class="notification-group">
        <h2>Hôm nay</h2>
        <article v-for="item in todayNotifications" :key="item.id" :class="{ unread: item.unread }" @click="markRead(item)">
          <span class="notification-icon"><component :is="iconByType(item.type)" :size="22" /></span>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.text }}</p>
          </div>
          <time>{{ item.time }}</time>
        </article>
      </section>

      <section v-if="olderNotifications.length" class="notification-group">
        <h2>Gần đây</h2>
        <article v-for="item in olderNotifications" :key="item.id" :class="{ unread: item.unread }" @click="markRead(item)">
          <span class="notification-icon"><component :is="iconByType(item.type)" :size="22" /></span>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.text }}</p>
          </div>
          <time>{{ item.time }}</time>
        </article>
      </section>
    </main>
  </section>
</template>

<style scoped>
.notifications-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 320px 1fr;
  background: var(--sf-bg);
  color: var(--sf-ink);
}

.mobile-head {
  display: none;
}

.notification-main {
  width: min(1120px, calc(100% - 64px));
  margin: 0 auto;
  padding: 42px 0 64px;
}

.page-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.page-heading h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1;
  letter-spacing: -0.05em;
}

.page-heading button {
  border: none;
  background: transparent;
  color: var(--sf-primary);
  font-weight: 900;
}

.account-links {
  display: none;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.account-links a {
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid var(--sf-line);
  border-radius: 999px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  font-weight: 800;
  color: var(--sf-ink);
}

.account-links a.active {
  border-color: var(--sf-primary);
  background: var(--sf-primary);
  color: #fff;
}

.notification-state {
  margin: 0;
  color: var(--sf-muted);
  font-weight: 700;
}

.notification-state.warning {
  color: var(--sf-primary);
}

.notification-group {
  display: grid;
  gap: 16px;
  margin-top: 28px;
}

.notification-group h2 {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 18px;
  margin: 0;
  color: #536073;
  font-size: 16px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.notification-group h2::after {
  content: "";
  height: 1px;
  background: #ccd7e6;
}

.notification-group article {
  min-height: 96px;
  display: grid;
  grid-template-columns: 60px 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 14px;
  background: #fff;
  box-shadow: var(--sf-shadow-soft);
  cursor: pointer;
}

.notification-group article.unread {
  box-shadow: inset 4px 0 0 var(--sf-primary), var(--sf-shadow-soft);
}

.notification-icon {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: #eaf1fb;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.unread .notification-icon {
  background: var(--sf-primary-soft);
  color: var(--sf-primary);
}

.notification-group strong {
  font-size: 20px;
}

.notification-group p {
  margin: 8px 0 0;
  color: #667085;
}

.notification-group time {
  color: #667085;
  white-space: nowrap;
}

.unread time {
  color: var(--sf-primary);
}

@media (max-width: 900px) {
  .notifications-page {
    display: block;
    min-height: 100vh;
  }

  .notification-main {
    width: calc(100% - 36px);
  }

  .mobile-head {
    height: 72px;
    display: grid;
    grid-template-columns: 40px 1fr 40px;
    align-items: center;
    background: #fff;
    border-bottom: 1px solid var(--sf-line);
  }

  .mobile-head h1 {
    margin: 0;
    text-align: center;
    font-size: 22px;
  }

  .notification-main {
    padding-top: 24px;
  }

  .page-heading {
    display: block;
  }

  .page-heading button {
    margin-top: 16px;
  }

  .notification-group article {
    grid-template-columns: 52px 1fr;
  }

  .notification-group time {
    grid-column: 2;
  }
}
</style>
