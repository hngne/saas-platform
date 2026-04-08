<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const props = defineProps<{ collapsed?: boolean }>()
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

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <!-- Logo -->
    <div class="logo-section">
      <div class="logo-icon">
        <i class="pi pi-shopping-bag" style="font-size: 1.3rem; color: #FF6B2B"></i>
      </div>
      <Transition name="fade-text">
        <div v-if="!collapsed" class="logo-text">
          <h1 class="logo-title">ShopFlow</h1>
          <p class="logo-sub">{{ authStore.tenant?.store_name || 'Merchant CMS' }}</p>
        </div>
      </Transition>
    </div>

    <!-- Navigation -->
    <nav class="nav-section">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item.to) }"
        :title="collapsed ? item.label : undefined"
        @click="emit('navigate')"
      >
        <i :class="item.icon" class="nav-icon"></i>
        <Transition name="fade-text">
          <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
        </Transition>
      </RouterLink>
    </nav>

    <!-- Bottom: Logout -->
    <div class="sidebar-bottom">
      <button class="nav-item logout-btn" :title="collapsed ? 'Đăng xuất' : undefined" @click="handleLogout">
        <i class="pi pi-sign-out nav-icon"></i>
        <Transition name="fade-text">
          <span v-if="!collapsed" class="nav-label">Đăng xuất</span>
        </Transition>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width, 250px);
  min-width: var(--sidebar-width, 250px);
  background: linear-gradient(180deg, #1A1A2E 0%, #16162a 100%);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed, 68px);
  min-width: var(--sidebar-collapsed, 68px);
}

/* ── Logo ──────────────────────── */
.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  min-height: 72px;
}
.sidebar.collapsed .logo-section {
  justify-content: center;
  padding: 20px 0;
}

.logo-icon {
  width: 38px;
  height: 38px;
  min-width: 38px;
  background: rgba(255, 107, 43, 0.12);
  border: 1px solid rgba(255, 107, 43, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text { white-space: nowrap; overflow: hidden; }

.logo-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

.logo-sub {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 1px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Nav ───────────────────────── */
.nav-section {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sidebar.collapsed .nav-section { padding: 12px 6px; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
}
.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 10px;
}

.nav-item:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.06);
}

.nav-item.active {
  color: #fff;
  background: rgba(255, 107, 43, 0.15);
}

.nav-item.active .nav-icon {
  color: #FF6B2B;
}

.nav-icon {
  font-size: 1.05rem;
  width: 20px;
  min-width: 20px;
  text-align: center;
}

.nav-label { white-space: nowrap; }

/* ── Bottom ────────────────────── */
.sidebar-bottom {
  padding: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.logout-btn:hover {
  color: #EF4444 !important;
  background: rgba(239, 68, 68, 0.1) !important;
}

/* ── Text fade transition ──────── */
.fade-text-enter-active { transition: opacity 0.2s ease 0.1s; }
.fade-text-leave-active { transition: opacity 0.1s ease; }
.fade-text-enter-from,
.fade-text-leave-to { opacity: 0; }
</style>
