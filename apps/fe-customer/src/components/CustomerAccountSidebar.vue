<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Bell, Grid2X2, LogOut, MapPin, Package, User } from "lucide-vue-next";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";
import { getStoreDisplayName } from "@/utils/storefront-brand";

const route = useRoute();
const router = useRouter();
const auth = useCustomerAuthStore();

const displayStoreName = computed(getStoreDisplayName);
const displayName = computed(() => auth.user?.name || "Khách hàng");
const avatarUrl = computed(() => auth.user?.avatar || auth.user?.avatar_url || "");
const initials = computed(() =>
  displayName.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join(""),
);

const isActive = (name: string | string[]) => {
  const names = Array.isArray(name) ? name : [name];
  return names.includes(String(route.name || ""));
};

const logout = async () => {
  await auth.logout();
  await router.push("/login");
};
</script>

<template>
  <aside class="account-sidebar">
    <RouterLink to="/" class="brand">{{ displayStoreName }}</RouterLink>

    <div class="user-mini">
      <div v-if="avatarUrl" class="avatar-photo"><img :src="avatarUrl" :alt="displayName" /></div>
      <div v-else class="avatar-fallback">{{ initials }}</div>
      <div>
        <strong>{{ displayName }}</strong>
        <span>Khách hàng của shop</span>
      </div>
    </div>

    <nav>
      <RouterLink to="/account" :class="{ active: isActive('account-dashboard') }">
        <Grid2X2 :size="22" /> Tổng quan
      </RouterLink>
      <RouterLink to="/account/orders" :class="{ active: isActive(['account-orders', 'account-order-detail', 'order-review']) }">
        <Package :size="22" /> Đơn hàng
      </RouterLink>
      <RouterLink to="/account/addresses" :class="{ active: isActive('address-book') }">
        <MapPin :size="22" /> Sổ địa chỉ
      </RouterLink>
      <RouterLink to="/account/notifications" :class="{ active: isActive('account-notifications') }">
        <Bell :size="22" /> Thông báo
      </RouterLink>
      <RouterLink to="/account/profile" :class="{ active: isActive('account-profile') }">
        <User :size="22" /> Hồ sơ
      </RouterLink>
    </nav>

    <button type="button" class="logout" @click="logout">
      <LogOut :size="20" /> Đăng xuất
    </button>
  </aside>
</template>

<style scoped>
.account-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 28px;
  background: #fff;
  border-right: 1px solid var(--sf-line);
}

.brand {
  display: block;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.1;
  word-break: break-word;
}

.user-mini {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 40px 0 28px;
  min-width: 0;
}

.avatar-photo,
.avatar-fallback {
  flex: 0 0 auto;
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
}

.user-mini strong,
.user-mini span {
  display: block;
  min-width: 0;
}

.user-mini strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-mini span {
  color: var(--sf-muted);
}

nav {
  display: grid;
  gap: 12px;
}

nav a,
.logout {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 0 16px;
  border-radius: 8px;
  color: #667085;
  font-weight: 800;
  background: transparent;
  border: none;
  text-align: left;
}

nav a svg,
.logout svg {
  flex: 0 0 auto;
}

nav a.active,
nav a.router-link-active {
  background: #edf4fd;
  color: var(--sf-primary);
}

.logout {
  margin-top: auto;
  text-align: left;
}

@media (max-width: 980px) {
  .account-sidebar {
    display: none;
  }
}
</style>
