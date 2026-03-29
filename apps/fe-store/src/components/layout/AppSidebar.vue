<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const emit = defineEmits<{ navigate: [] }>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

interface NavItem {
  label: string
  icon: string
  to: string
}

const navItems: NavItem[] = [
  { label: 'Tổng quan', icon: 'pi pi-chart-bar', to: '/dashboard' },
  { label: 'Sản phẩm', icon: 'pi pi-box', to: '/products' },
  { label: 'Danh mục', icon: 'pi pi-tags', to: '/categories' },
  { label: 'Thuộc tính', icon: 'pi pi-palette', to: '/attributes' },
  { label: 'Kho hàng', icon: 'pi pi-warehouse', to: '/inventory' },
  { label: 'Vận chuyển', icon: 'pi pi-truck', to: '/shipping' },
  { label: 'Đơn hàng', icon: 'pi pi-receipt', to: '/orders' },
  { label: 'Voucher', icon: 'pi pi-ticket', to: '/vouchers' },
  { label: 'Khuyến mãi', icon: 'pi pi-megaphone', to: '/promotions' },
  { label: 'Cài đặt', icon: 'pi pi-cog', to: '/settings' },
]

const isActive = (to: string) => {
  return route.path === to || route.path.startsWith(to + '/')
}
</script>

<template>
  <aside class="sidebar">
    <!-- Logo -->
    <div class="logo-section">
      <div class="logo-icon">
        <i class="pi pi-shopping-bag" style="font-size: 1.4rem; color: #FF6B2B"></i>
      </div>
      <div>
        <h1 class="logo-title">ShopFlow</h1>
        <p class="logo-sub">{{ authStore.tenant?.store_name || 'Merchant CMS' }}</p>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="nav-section">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item.to) }"
        @click="emit('navigate')"
      >
        <i :class="item.icon" class="nav-icon"></i>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- Bottom: Logout -->
    <div class="sidebar-bottom">
      <button class="nav-item logout-btn" @click="authStore.logout().then(() => router.push('/login'))">
        <i class="pi pi-sign-out nav-icon"></i>
        <span>Đăng xuất</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 250px;
  min-width: 250px;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 107, 43, 0.15);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

.logo-sub {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 1px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-section {
  flex: 1;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.nav-item.active {
  color: #fff;
  background: rgba(255, 107, 43, 0.2);
}

.nav-item.active .nav-icon {
  color: #FF6B2B;
}

.nav-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.sidebar-bottom {
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.logout-btn:hover {
  color: #EF4444 !important;
  background: rgba(239, 68, 68, 0.1) !important;
}
</style>
