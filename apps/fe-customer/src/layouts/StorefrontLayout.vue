<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  Bell,
  ChevronDown,
  Grid2X2,
  Home,
  Menu,
  Search,
  ShoppingBag,
  Store,
  User,
} from "lucide-vue-next";
import { getStoreDisplayName } from "@/utils/storefront-brand";
import { useCartStore } from "@/stores/cart.store";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";
import { useUiStore } from "@/stores/ui.store";
import { useShopStore } from "@/stores/shop.store";
import { notificationApi, type NotificationItem } from "@/api/customer";
import { storefrontApi } from "@/api/storefront";
import type { Category } from "@/data/storefront";

const router = useRouter();
const cart = useCartStore();
const auth = useCustomerAuthStore();
const ui = useUiStore();
const shopStore = useShopStore();

const keyword = ref("");
const apiCategories = ref<Category[]>([]);
const loadingNotifications = ref(false);
const notificationItems = ref<NotificationItem[]>([]);
const notificationOpen = ref(false);
const notificationPanel = ref<HTMLElement | null>(null);

const displayStoreName = computed(() => shopStore.getStoreName() || getStoreDisplayName());
const shopLogo = computed(() => shopStore.profile?.logo_url || "");
const shopThemeStyle = computed(() => shopStore.themeStyle);
const topCategories = computed(() => apiCategories.value);
const unreadCount = computed(() => notificationItems.value.filter((item) => item.unread).length);
const isAuthenticated = computed(() => auth.isAuthenticated);

const submitSearch = () => {
  const search = keyword.value.trim();
  router.push({ path: search ? "/search" : "/products", query: search ? { q: search } : {} });
};

const loadCategories = async () => {
  try {
    apiCategories.value = await storefrontApi.getCategories();
  } catch {
    apiCategories.value = [];
  }
};

const loadNotifications = async () => {
  if (!isAuthenticated.value) {
    notificationItems.value = [];
    return;
  }

  loadingNotifications.value = true;
  try {
    const result = await notificationApi.getAll({ limit: 6 });
    notificationItems.value = result.data;
  } catch {
    notificationItems.value = [];
  } finally {
    loadingNotifications.value = false;
  }
};

const openNotifications = async () => {
  notificationOpen.value = !notificationOpen.value;
  if (notificationOpen.value) {
    await loadNotifications();
    await nextTick();
  }
};

const closeNotifications = () => {
  notificationOpen.value = false;
};

const handleNotificationClick = async (item: NotificationItem) => {
  if (item.unread) {
    await notificationApi.markAsRead(item.id).catch(() => null);
    notificationItems.value = notificationItems.value.map((entry) =>
      entry.id === item.id ? { ...entry, unread: false } : entry,
    );
  }

  closeNotifications();
  router.push("/account/notifications");
};

const markAllNotificationsRead = async () => {
  await notificationApi.markAllAsRead().catch(() => null);
  notificationItems.value = notificationItems.value.map((item) => ({ ...item, unread: false }));
};

const handleOutsideClick = (event: MouseEvent) => {
  if (!notificationOpen.value) return;
  if (!notificationPanel.value) return;
  if (notificationPanel.value.contains(event.target as Node)) return;
  closeNotifications();
};

onMounted(async () => {
  auth.hydrate();
  await Promise.all([shopStore.fetchProfile(), loadCategories(), loadNotifications()]);
  document.addEventListener("click", handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
});
</script>

<template>
  <div class="sf-page theme-editorial" :style="shopThemeStyle">
    <header class="site-header">
      <div class="sf-container header-inner">
        <RouterLink to="/" class="brand">
          <img v-if="shopLogo" :src="shopLogo" :alt="displayStoreName" class="brand-logo" />
          <span>{{ displayStoreName }}</span>
        </RouterLink>

        <nav class="desktop-nav" aria-label="Điều hướng chính">
          <div v-for="category in topCategories" :key="category.slug" class="nav-category">
            <RouterLink :to="`/categories/${category.slug}`" class="nav-link nav-parent">
              <span>{{ category.name }}</span>
              <ChevronDown v-if="category.children?.length" :size="15" />
            </RouterLink>

            <div v-if="category.children?.length" class="nav-dropdown">
              <div class="nav-dropdown-inner">
                <RouterLink :to="`/categories/${category.slug}`" class="nav-dropdown-item nav-dropdown-all">
                  Xem tất cả {{ category.name.toLowerCase() }}
                </RouterLink>

                <RouterLink
                  v-for="child in category.children"
                  :key="child.slug"
                  :to="`/categories/${child.slug}`"
                  class="nav-dropdown-item"
                >
                  <strong>{{ child.name }}</strong>
                  <span>{{ child.caption }}</span>
                </RouterLink>
              </div>
            </div>
          </div>

          <RouterLink to="/blog" class="nav-link">Blog</RouterLink>
          <RouterLink to="/stores" class="nav-link">Cửa hàng</RouterLink>
        </nav>

        <form class="search-box" role="search" @submit.prevent="submitSearch">
          <Search :size="16" />
          <input
            v-model="keyword"
            aria-label="Tìm kiếm"
            placeholder="Tìm sofa, gốm sứ, tai nghe..."
          />
        </form>

        <div class="header-actions">
          <RouterLink class="sf-icon-button desktop-only" to="/search" aria-label="Tìm kiếm">
            <Search :size="21" />
          </RouterLink>

          <div v-if="isAuthenticated" ref="notificationPanel" class="notification-wrap">
            <button class="sf-icon-button" type="button" aria-label="Thông báo" @click.stop="openNotifications">
              <Bell :size="20" />
              <span v-if="unreadCount" class="cart-count">{{ unreadCount }}</span>
            </button>

            <div v-if="notificationOpen" class="notification-dropdown">
              <div class="notification-head">
                <strong>Thông báo</strong>
                <button type="button" @click="markAllNotificationsRead">Đánh dấu đã đọc</button>
              </div>

              <div v-if="loadingNotifications" class="notification-state">Đang tải thông báo...</div>
              <div v-else-if="!notificationItems.length" class="notification-state">Bạn chưa có thông báo nào.</div>

              <button
                v-for="item in notificationItems"
                v-else
                :key="item.id"
                type="button"
                class="notification-item"
                :class="{ unread: item.unread }"
                @click="handleNotificationClick(item)"
              >
                <div>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.text }}</p>
                </div>
                <small>{{ item.time }}</small>
              </button>

              <RouterLink to="/account/notifications" class="notification-footer" @click="closeNotifications">
                Xem toàn bộ thông báo
              </RouterLink>
            </div>
          </div>

          <RouterLink class="sf-icon-button" to="/cart" aria-label="Giỏ hàng">
            <ShoppingBag :size="20" />
            <span v-if="cart.count" class="cart-count">{{ cart.count }}</span>
          </RouterLink>

          <RouterLink
            class="sf-icon-button desktop-only"
            :to="isAuthenticated ? '/account' : '/login'"
            aria-label="Tài khoản"
          >
            <User :size="20" />
          </RouterLink>

          <button class="sf-icon-button mobile-menu" type="button" aria-label="Mở menu">
            <Menu :size="22" />
          </button>
        </div>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <transition name="toast-fade">
      <div v-if="ui.toastVisible" class="toast" role="status" aria-live="polite">
        {{ ui.toastMessage }}
      </div>
    </transition>

    <nav class="mobile-tabbar" aria-label="Điều hướng di động">
      <RouterLink to="/">
        <Home :size="22" />
        <span>Trang chủ</span>
      </RouterLink>
      <RouterLink to="/products">
        <Grid2X2 :size="22" />
        <span>Danh mục</span>
      </RouterLink>
      <RouterLink to="/cart" class="cart-tab">
        <ShoppingBag :size="22" />
        <span>Giỏ hàng</span>
      </RouterLink>
      <RouterLink to="/stores">
        <Store :size="22" />
        <span>Cửa hàng</span>
      </RouterLink>
      <RouterLink :to="isAuthenticated ? '/account' : '/login'">
        <User :size="22" />
        <span>Tài khoản</span>
      </RouterLink>
    </nav>

    <footer class="site-footer">
      <div class="sf-container footer-grid">
        <section>
          <h3>{{ displayStoreName }}</h3>
          <p>Nền tảng mua sắm chọn lọc cho phong cách sống hiện đại.</p>
        </section>
        <section>
          <h4>Về chúng tôi</h4>
          <a>Chính sách bền vững</a>
          <a>Đối tác thương hiệu</a>
          <a>Liên hệ</a>
        </section>
        <section>
          <h4>Hỗ trợ khách hàng</h4>
          <RouterLink to="/support">Trợ lý trực tuyến</RouterLink>
          <RouterLink to="/account/orders">Tra cứu đơn hàng</RouterLink>
          <a>Chính sách đổi trả</a>
          <a>Bảo mật thanh toán</a>
        </section>
        <section>
          <h4>Nhận bản tin</h4>
          <p>Ưu đãi và tuyển chọn mới nhất mỗi tuần.</p>
          <form class="newsletter">
            <input placeholder="Email của bạn" aria-label="Email" />
            <button type="button">Gửi</button>
          </form>
        </section>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
  border-bottom: 1px solid var(--sf-line);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
}

.header-inner {
  min-height: 72px;
  display: grid;
  grid-template-columns: auto 1fr minmax(260px, 380px) auto;
  align-items: center;
  gap: 30px;
}

.brand {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.04em;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.brand-logo {
  height: 36px;
  width: auto;
  object-fit: contain;
  border-radius: 6px;
}

.desktop-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  color: #243044;
  font-weight: 700;
}

.nav-link,
.nav-parent {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 24px 0;
}

.nav-link.router-link-active,
.nav-link:hover,
.nav-parent.router-link-active,
.nav-parent:hover {
  color: var(--sf-primary);
}

.nav-category {
  position: relative;
}

.nav-dropdown {
  position: absolute;
  top: calc(100% - 8px);
  left: 50%;
  min-width: 280px;
  padding-top: 10px;
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, 8px);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease,
    visibility 0.18s ease;
}

.nav-category:hover .nav-dropdown,
.nav-category:focus-within .nav-dropdown {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0);
}

.nav-dropdown-inner {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--sf-line);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.12);
}

.nav-dropdown-item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--sf-ink);
}

.nav-dropdown-item:hover {
  background: #f4f8fd;
}

.nav-dropdown-item strong {
  font-size: 14px;
}

.nav-dropdown-item span {
  color: var(--sf-muted);
  font-size: 12px;
  line-height: 1.5;
}

.nav-dropdown-all {
  border-bottom: 1px solid var(--sf-line);
  border-radius: 0;
  padding-top: 4px;
  padding-bottom: 14px;
  margin-bottom: 4px;
  color: var(--sf-primary);
  font-weight: 800;
}

.search-box {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid var(--sf-line);
  border-radius: 999px;
  background: #f3f7fc;
  color: var(--sf-muted);
}

.search-box input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--sf-ink);
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.notification-wrap {
  position: relative;
}

.notification-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 360px;
  max-width: calc(100vw - 32px);
  border: 1px solid var(--sf-line);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.14);
  overflow: hidden;
}

.notification-head,
.notification-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
}

.notification-head {
  border-bottom: 1px solid var(--sf-line);
}

.notification-head button {
  border: none;
  background: transparent;
  color: var(--sf-primary);
  font-weight: 800;
}

.notification-state {
  padding: 18px 16px;
  color: var(--sf-muted);
  font-weight: 700;
}

.notification-item {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  padding: 14px 16px;
  border: none;
  border-bottom: 1px solid #eef2f7;
  background: #fff;
  text-align: left;
}

.notification-item.unread {
  background: #f8fbff;
}

.notification-item strong {
  display: block;
  margin-bottom: 4px;
}

.notification-item p {
  margin: 0;
  color: var(--sf-muted);
  line-height: 1.5;
}

.notification-item small {
  color: var(--sf-muted);
  white-space: nowrap;
}

.notification-footer {
  justify-content: center;
  color: var(--sf-primary);
  font-weight: 800;
}

.cart-count {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--sf-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mobile-menu,
.mobile-tabbar {
  display: none;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 108px;
  z-index: 90;
  min-height: 48px;
  max-width: min(520px, calc(100vw - 32px));
  padding: 12px 18px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.24);
  transform: translateX(-50%);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

.site-footer {
  margin-top: 70px;
  padding: 52px 0 38px;
  background: var(--sf-dark);
  color: #d8e0eb;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1.3fr;
  gap: 48px;
}

.footer-grid h3,
.footer-grid h4 {
  margin: 0 0 16px;
  color: #fff;
}

.footer-grid p {
  margin: 0;
  color: #aeb9c8;
  line-height: 1.7;
}

.footer-grid a {
  display: block;
  margin: 10px 0;
  color: #c7d1df;
}

.newsletter {
  display: flex;
  margin-top: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  overflow: hidden;
}

.newsletter input {
  min-width: 0;
  flex: 1;
  border: none;
  outline: none;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.newsletter button {
  border: none;
  background: var(--sf-primary);
  color: #fff;
  padding: 0 14px;
  font-weight: 800;
}

@media (max-width: 1180px) {
  .header-inner {
    grid-template-columns: auto 1fr auto;
  }

  .desktop-nav,
  .search-box {
    display: none;
  }
}

@media (max-width: 768px) {
  .header-inner {
    min-height: 68px;
    grid-template-columns: auto 1fr auto;
    gap: 10px;
  }

  .brand {
    font-size: 20px;
    text-align: left;
  }

  .desktop-only {
    display: none;
  }

  .mobile-menu {
    display: inline-flex;
  }

  .site-footer {
    margin-bottom: 78px;
  }

  .footer-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .mobile-tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    height: 74px;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    background: #fff;
    border-top: 1px solid var(--sf-line);
    box-shadow: 0 -10px 30px rgba(16, 24, 40, 0.08);
  }

  .mobile-tabbar a {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .mobile-tabbar a.router-link-active {
    color: var(--sf-accent);
    background: var(--sf-primary-soft);
  }

  .toast {
    bottom: 94px;
    border-radius: 16px;
  }
}
</style>
