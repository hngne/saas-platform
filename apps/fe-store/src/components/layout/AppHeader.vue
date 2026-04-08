<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { computed } from 'vue'

defineProps<{ showMenuBtn?: boolean }>()
const emit = defineEmits<{ 'toggle-sidebar': [] }>()

const route = useRoute()
const authStore = useAuthStore()

const pageTitle = computed(() => (route.meta?.title as string) || 'Tổng quan')

// Simple breadcrumb from route path
const breadcrumbs = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  if (parts.length <= 1) return []
  const labels: Record<string, string> = {
    dashboard: 'Tổng quan', products: 'Sản phẩm', categories: 'Danh mục',
    attributes: 'Thuộc tính', inventory: 'Kho hàng', shipping: 'Vận chuyển',
    orders: 'Đơn hàng', vouchers: 'Voucher', promotions: 'Khuyến mãi',
    settings: 'Cài đặt', new: 'Thêm mới', edit: 'Chỉnh sửa', logs: 'Lịch sử',
  }
  return parts.map(p => labels[p] || p).slice(0, -1)
})
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <button v-if="showMenuBtn" class="menu-btn" @click="emit('toggle-sidebar')">
        <i class="pi pi-bars"></i>
      </button>
      <div>
        <h2 class="page-title">{{ pageTitle }}</h2>
        <div v-if="breadcrumbs.length" class="breadcrumb">
          <span v-for="(b, i) in breadcrumbs" :key="i">
            {{ b }}<i v-if="i < breadcrumbs.length - 1" class="pi pi-angle-right bc-sep"></i>
          </span>
          <i class="pi pi-angle-right bc-sep"></i>
          <span class="bc-current">{{ pageTitle }}</span>
        </div>
      </div>
    </div>

    <div class="header-right">
      <!-- Notification bell (UI only) -->
      <button class="icon-btn hide-mobile">
        <i class="pi pi-bell"></i>
        <span class="notif-dot"></span>
      </button>

      <!-- Divider -->
      <div class="divider hide-mobile"></div>

      <!-- User Info -->
      <div class="user-info">
        <div class="user-avatar">
          {{ authStore.user?.name?.charAt(0)?.toUpperCase() || 'M' }}
        </div>
        <div class="user-details hide-mobile">
          <span class="user-name">{{ authStore.user?.name || 'Merchant' }}</span>
          <span class="user-role">{{ authStore.tenant?.business_type || 'RETAIL' }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-height, 64px);
  min-height: var(--header-height, 64px);
  background: #fff;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Menu button */
.menu-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  transition: all 0.15s ease;
  font-size: 1rem;
}
.menu-btn:hover { background: #f3f4f6; }

.page-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--text-light);
  margin-top: 2px;
}
.bc-sep {
  font-size: 0.55rem;
  color: var(--text-light);
}
.bc-current {
  color: var(--primary);
  font-weight: 600;
}

/* Right side */
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 0.95rem;
  transition: all 0.15s ease;
}
.icon-btn:hover { background: #f3f4f6; color: var(--text-primary); }

.notif-dot {
  position: absolute;
  top: 7px;
  right: 8px;
  width: 7px;
  height: 7px;
  background: var(--primary);
  border-radius: 50%;
  border: 1.5px solid #fff;
}

.divider {
  width: 1px;
  height: 28px;
  background: var(--border);
}

/* User info */
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, #FF6B2B, #FF8F5E);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.8rem;
}

.user-details {
  display: flex;
  flex-direction: column;
}
.user-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}
.user-role {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (max-width: 768px) {
  .app-header { padding: 0 16px; }
  .page-title { font-size: 1rem; }
  .breadcrumb { display: none; }
}
</style>
