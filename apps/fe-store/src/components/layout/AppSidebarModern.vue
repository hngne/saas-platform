<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ navigate: [], 'toggle-collapse': [] }>()

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
  { label: 'Nhân viên', icon: 'pi pi-users', to: '/staff' },
  { label: 'Người dùng', icon: 'pi pi-user', to: '/customers' },
  { label: 'Cửa hàng', icon: 'pi pi-home', to: '/stores' },
  { label: 'Sản phẩm', icon: 'pi pi-box', to: '/products' },
  { label: 'Danh mục', icon: 'pi pi-tags', to: '/categories' },
  { label: 'Thuộc tính', icon: 'pi pi-palette', to: '/attributes' },
  { label: 'Kho hàng', icon: 'pi pi-warehouse', to: '/inventory' },
  { label: 'Vận chuyển', icon: 'pi pi-truck', to: '/shipping' },
  { label: 'Đơn hàng', icon: 'pi pi-receipt', to: '/orders' },
  { label: 'Voucher', icon: 'pi pi-ticket', to: '/vouchers' },
  { label: 'Khuyến mãi', icon: 'pi pi-megaphone', to: '/promotions' },
  { label: 'Bài viết blog', icon: 'pi pi-file-edit', to: '/blog/posts' },
  { label: 'Danh mục blog', icon: 'pi pi-folder', to: '/blog/categories' },
  { label: 'Trợ lý AI', icon: 'pi pi-sparkles', to: '/ai-chat' },
  { label: 'Cài đặt', icon: 'pi pi-cog', to: '/settings' },
]

const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const showSupport = ref(false)
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
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
      <button class="collapse-toggle" :title="collapsed ? 'Mở rộng' : 'Thu gọn'" @click="emit('toggle-collapse')">
        <i :class="collapsed ? 'pi pi-angle-double-right' : 'pi pi-angle-double-left'"></i>
      </button>
    </div>

    <div class="nav-scroll">
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

      <div class="sidebar-bottom">
        <button class="nav-item support-btn" :title="collapsed ? 'Hỗ trợ' : undefined" @click="showSupport = true">
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
    </div>
  </aside>

  <!-- Support Dialog -->
  <Teleport to="body">
    <Transition name="support-fade">
      <div v-if="showSupport" class="support-overlay" @click.self="showSupport = false">
        <div class="support-dialog">
          <header class="support-header">
            <div>
              <h2>Trung tâm hỗ trợ</h2>
              <p>ShopFlow — Nền tảng SaaS bán hàng đa kênh</p>
            </div>
            <button class="close-btn" @click="showSupport = false"><i class="pi pi-times"></i></button>
          </header>

          <div class="support-body">
            <a href="https://zalo.me/0876546789" target="_blank" class="support-card zalo">
              <i class="pi pi-comments"></i>
              <div>
                <strong>Chat Zalo</strong>
                <span>Nhắn tin trực tiếp với đội ngũ hỗ trợ</span>
              </div>
              <i class="pi pi-arrow-up-right"></i>
            </a>

            <a href="mailto:support@shopflow.vn" class="support-card email">
              <i class="pi pi-envelope"></i>
              <div>
                <strong>Email hỗ trợ</strong>
                <span>support@shopflow.vn</span>
              </div>
              <i class="pi pi-arrow-up-right"></i>
            </a>

            <a href="tel:19001234" class="support-card phone">
              <i class="pi pi-phone"></i>
              <div>
                <strong>Hotline</strong>
                <span>1900 1234 (8:00 – 22:00)</span>
              </div>
              <i class="pi pi-arrow-up-right"></i>
            </a>

            <div class="support-card info">
              <i class="pi pi-clock"></i>
              <div>
                <strong>Giờ làm việc</strong>
                <span>Thứ 2 – Chủ nhật, 8:00 – 22:00</span>
              </div>
            </div>
          </div>

          <footer class="support-footer">
            <p>Phiên bản <strong>ShopFlow v1.0</strong> · © 2026</p>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
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
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed, 68px);
  min-width: var(--sidebar-collapsed, 68px);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px;
  border-bottom: 1px solid #F0F0F0;
  min-height: 72px;
  flex-shrink: 0;
}

.collapse-toggle {
  margin-left: auto;
  width: 28px;
  height: 28px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #F9FAFB;
  color: #9CA3AF;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.collapse-toggle:hover {
  background: #FF6B2B;
  border-color: #FF6B2B;
  color: #fff;
}

.sidebar.collapsed .collapse-toggle {
  margin: 0;
}

.sidebar.collapsed .logo-section {
  flex-direction: column;
  gap: 8px;
  padding: 16px 0 12px;
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

.logo-text {
  white-space: nowrap;
  overflow: hidden;
}

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

.nav-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-section {
  padding: 16px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar.collapsed .nav-section {
  padding: 12px 6px;
}

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

.sidebar-bottom {
  padding: 8px 12px 16px;
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

.support-btn:hover {
  color: #FF6B2B !important;
  background: #FFF3ED !important;
}

.logout-btn:hover {
  color: #EF4444 !important;
  background: #FEF2F2 !important;
}

.fade-text-enter-active {
  transition: opacity 0.2s ease 0.1s;
}

.fade-text-leave-active {
  transition: opacity 0.1s ease;
}

.fade-text-enter-from,
.fade-text-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .sidebar {
    width: min(82vw, 300px);
    min-width: min(82vw, 300px);
  }
}

/* Support Dialog */
.support-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

.support-dialog {
  width: min(460px, 92vw);
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.support-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  color: #fff;
}

.support-header h2 {
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.support-header p {
  font-size: 0.75rem;
  opacity: 0.85;
  margin-top: 2px;
}

.close-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

.support-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.support-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid #f0f0f0;
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  cursor: pointer;
}

.support-card:hover {
  border-color: #FF6B2B;
  background: #FFF8F5;
}

.support-card > i:first-child {
  width: 42px;
  height: 42px;
  min-width: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 1.15rem;
}

.support-card.zalo > i:first-child {
  background: #E3F2FD;
  color: #1976D2;
}

.support-card.email > i:first-child {
  background: #FFF3ED;
  color: #FF6B2B;
}

.support-card.phone > i:first-child {
  background: #E8F5E9;
  color: #2E7D32;
}

.support-card.info > i:first-child {
  background: #F3E5F5;
  color: #7B1FA2;
}

.support-card div {
  flex: 1;
}

.support-card strong {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
}

.support-card span {
  font-size: 0.78rem;
  color: #9CA3AF;
  margin-top: 2px;
  display: block;
}

.support-card > i:last-child {
  font-size: 0.8rem;
  color: #D1D5DB;
}

.support-footer {
  padding: 14px 24px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

.support-footer p {
  font-size: 0.72rem;
  color: #9CA3AF;
}

.support-fade-enter-active {
  transition: opacity 0.2s ease;
}

.support-fade-leave-active {
  transition: opacity 0.15s ease;
}

.support-fade-enter-from,
.support-fade-leave-to {
  opacity: 0;
}
</style>
