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
  { label: 'Dashboard', icon: 'pi pi-th-large', to: '/dashboard' },
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

    <!-- Bottom -->
    <div class="sidebar-bottom">
      <!-- Upgrade Plan Button -->
      <Transition name="fade-text">
        <button v-if="!collapsed" class="upgrade-btn">
          <span>Upgrade Plan</span>
        </button>
      </Transition>

      <button class="nav-item support-btn" :title="collapsed ? 'Hỗ trợ' : undefined">
        <i class="pi pi-question-circle nav-icon"></i>
        <Transition name="fade-text">
          <span v-if="!collapsed" class="nav-label">Hỗ trợ</span>
        </Transition>
      </button>

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
  width: var(--sidebar-width, 260px);
  min-width: var(--sidebar-width, 260px);
  background: #ffffff;
  border-right: 1px solid #F0F0F0;
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
  padding: 20px 20px;
  border-bottom: 1px solid #F0F0F0;
  min-height: 72px;
}
.sidebar.collapsed .logo-section {
  justify-content: center;
  padding: 20px 0;
}

.logo-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  background: #FFF3ED;
  border: 1px solid #FFE0D0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text { white-space: nowrap; overflow: hidden; }

.logo-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #FF6B2B;
  letter-spacing: -0.02em;
}

.logo-sub {
  font-size: 0.65rem;
  color: #9CA3AF;
  margin-top: 1px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

/* ── Nav ───────────────────────── */
.nav-section {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sidebar.collapsed .nav-section { padding: 12px 6px; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  border-radius: 10px;
  color: #6B7280;
  text-decoration: none;
  font-size: 0.88rem;
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
  padding: 11px;
}

.nav-item:hover {
  color: #111827;
  background: #F9FAFB;
}

.nav-item.active {
  color: #fff;
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  box-shadow: 0 4px 12px rgba(255, 107, 43, 0.3);
  font-weight: 600;
}

.nav-item.active .nav-icon {
  color: #fff;
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
  padding: 12px;
  border-top: 1px solid #F0F0F0;
}

.upgrade-btn {
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(255, 107, 43, 0.25);
}
.upgrade-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 107, 43, 0.35);
}

.support-btn:hover {
  color: #FF6B2B !important;
  background: #FFF3ED !important;
}

.logout-btn:hover {
  color: #EF4444 !important;
  background: #FEF2F2 !important;
}

/* ── Text fade transition ──────── */
.fade-text-enter-active { transition: opacity 0.2s ease 0.1s; }
.fade-text-leave-active { transition: opacity 0.1s ease; }
.fade-text-enter-from,
.fade-text-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .sidebar {
    width: min(82vw, 300px);
    min-width: min(82vw, 300px);
  }
}
</style>
