<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

defineProps<{ showMenuBtn?: boolean }>()
const emit = defineEmits<{ 'toggle-sidebar': [] }>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationStore()

const notifOpen = ref(false)
const notifPanelRef = ref<HTMLElement | null>(null)
const toastVisible = ref(false)
const toastTimer = ref<ReturnType<typeof setTimeout> | null>(null)

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
    blog: 'Blog', posts: 'Bài viết', staff: 'Nhân viên', customers: 'Khách hàng',
    stores: 'Cửa hàng',
  }
  return parts.map(p => labels[p] || p).slice(0, -1)
})

const typeIcon: Record<string, string> = {
  ORDER: 'pi-shopping-bag',
  INVENTORY: 'pi-box',
  PAYMENT: 'pi-credit-card',
  SYSTEM: 'pi-info-circle',
}

const formatTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const now = Date.now()
    const diff = now - d.getTime()
    if (diff < 60_000) return 'Vừa xong'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`
    return d.toLocaleDateString('vi-VN')
  } catch { return '' }
}

const toggleNotifPanel = async () => {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value) {
    await notifStore.fetchNotifications()
  }
}

const handleNotifClick = async (item: { id: string; is_read: boolean; type: string }) => {
  if (!item.is_read) {
    await notifStore.markAsRead(item.id)
  }
  notifOpen.value = false
  // Navigate based on type
  if (item.type === 'ORDER') router.push('/orders')
  else if (item.type === 'INVENTORY') router.push('/inventory')
}

const handleOutsideClick = (e: MouseEvent) => {
  if (!notifOpen.value || !notifPanelRef.value) return
  if (!notifPanelRef.value.contains(e.target as Node)) {
    notifOpen.value = false
  }
}

// Watch for new toast notifications from socket
watch(() => notifStore.latestToast, (toast) => {
  if (!toast) return
  toastVisible.value = true
  if (toastTimer.value) clearTimeout(toastTimer.value)
  toastTimer.value = setTimeout(() => {
    toastVisible.value = false
    notifStore.clearToast()
  }, 5000)
})

onMounted(() => {
  // Connect socket when header mounts
  notifStore.connectSocket()
  notifStore.fetchNotifications()
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  if (toastTimer.value) clearTimeout(toastTimer.value)
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
      <!-- Notification bell -->
      <div ref="notifPanelRef" class="notif-wrap">
        <button class="icon-btn" @click.stop="toggleNotifPanel">
          <i class="pi pi-bell"></i>
          <span v-if="notifStore.unreadCount" class="notif-badge">{{ notifStore.unreadCount > 9 ? '9+' : notifStore.unreadCount }}</span>
          <span v-else-if="notifStore.connected" class="notif-dot-live"></span>
        </button>

        <!-- Dropdown -->
        <Transition name="dd">
          <div v-if="notifOpen" class="notif-dropdown">
            <div class="notif-dd-head">
              <strong>Thông báo</strong>
              <button v-if="notifStore.unreadCount" type="button" @click="notifStore.markAllAsRead()">Đã đọc tất cả</button>
            </div>

            <div v-if="notifStore.loading" class="notif-dd-empty">Đang tải...</div>
            <div v-else-if="!notifStore.items.length" class="notif-dd-empty">Chưa có thông báo nào</div>

            <button
              v-for="n in notifStore.items.slice(0, 8)"
              v-else
              :key="n.id"
              type="button"
              class="notif-dd-item"
              :class="{ unread: !n.is_read }"
              @click="handleNotifClick(n)"
            >
              <i class="pi" :class="typeIcon[n.type] || 'pi-info-circle'"></i>
              <div>
                <strong>{{ n.title }}</strong>
                <p>{{ n.body }}</p>
              </div>
              <small>{{ formatTime(n.created_at) }}</small>
            </button>
          </div>
        </Transition>
      </div>

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

    <!-- Toast popup for new notification -->
    <Transition name="toast">
      <div v-if="toastVisible && notifStore.latestToast" class="notif-toast" @click="toastVisible = false; notifStore.clearToast()">
        <i class="pi" :class="typeIcon[notifStore.latestToast.type] || 'pi-info-circle'"></i>
        <div>
          <strong>{{ notifStore.latestToast.title }}</strong>
          <p>{{ notifStore.latestToast.body }}</p>
        </div>
      </div>
    </Transition>
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
  min-width: 0;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  flex-shrink: 0;
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

.notif-wrap {
  position: relative;
}

.notif-badge {
  position: absolute;
  top: 3px;
  right: 3px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  line-height: 1;
}

.notif-dot-live {
  position: absolute;
  top: 7px;
  right: 8px;
  width: 7px;
  height: 7px;
  background: #22c55e;
  border-radius: 50%;
  border: 1.5px solid #fff;
}

/* ── Dropdown ────────────────────── */
.notif-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 380px;
  max-width: calc(100vw - 32px);
  max-height: 520px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.14);
  z-index: 60;
}

.notif-dd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.notif-dd-head strong {
  font-size: 0.95rem;
}

.notif-dd-head button {
  border: none;
  background: transparent;
  color: var(--primary);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.notif-dd-empty {
  padding: 28px 18px;
  text-align: center;
  color: var(--text-muted);
  font-weight: 600;
}

.notif-dd-item {
  width: 100%;
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 12px;
  align-items: start;
  padding: 14px 18px;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.notif-dd-item:hover {
  background: #f8fafc;
}

.notif-dd-item.unread {
  background: #eff6ff;
}

.notif-dd-item i {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f0f4f8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  font-size: 0.85rem;
}

.notif-dd-item.unread i {
  background: var(--primary);
  color: #fff;
}

.notif-dd-item strong {
  display: block;
  font-size: 0.82rem;
  color: var(--text-primary);
  margin-bottom: 3px;
}

.notif-dd-item p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-dd-item small {
  white-space: nowrap;
  color: var(--text-light);
  font-size: 0.7rem;
}

/* ── Toast ───────────────────────── */
.notif-toast {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 100;
  width: 360px;
  max-width: calc(100vw - 48px);
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 14px;
  align-items: start;
  padding: 18px 20px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06);
  cursor: pointer;
  animation: toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.notif-toast i {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
}

.notif-toast strong {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 4px;
}

.notif-toast p {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* ── Transitions ─────────────────── */
.dd-enter-active { animation: ddIn 0.2s ease both; }
.dd-leave-active { animation: ddOut 0.15s ease both; }
@keyframes ddIn { from { opacity: 0; transform: translateY(-6px); } }
@keyframes ddOut { to { opacity: 0; transform: translateY(-6px); } }

.toast-enter-active { animation: toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
.toast-leave-active { animation: toastSlideOut 0.25s ease both; }
@keyframes toastSlideIn { from { opacity: 0; transform: translateX(40px); } }
@keyframes toastSlideOut { to { opacity: 0; transform: translateX(40px); } }

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
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
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

@media (max-width: 980px) {
  .divider,
  .user-details {
    display: none;
  }
}
</style>
