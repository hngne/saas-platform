<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { computed } from 'vue'

const emit = defineEmits<{ 'toggle-sidebar': [] }>()

const route = useRoute()
const authStore = useAuthStore()

const pageTitle = computed(() => (route.meta?.title as string) || 'Tổng quan')
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <!-- Mobile menu button -->
      <button class="menu-btn" @click="emit('toggle-sidebar')">
        <i class="pi pi-bars" style="font-size: 1.1rem"></i>
      </button>
      <h2 class="page-title">{{ pageTitle }}</h2>
    </div>

    <div class="header-right">
      <!-- User Info -->
      <div class="user-info">
        <div class="user-avatar">
          {{ authStore.user?.name?.charAt(0)?.toUpperCase() || 'M' }}
        </div>
        <div class="user-details">
          <span class="user-name">{{ authStore.user?.name || 'Merchant' }}</span>
          <span class="user-role">{{ authStore.tenant?.business_type || 'RETAIL' }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 64px;
  min-height: 64px;
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

.menu-btn {
  display: none;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  transition: all 0.2s;
}

.menu-btn:hover {
  background: #f3f4f6;
}

@media (max-width: 768px) {
  .menu-btn {
    display: flex;
  }

  .app-header {
    padding: 0 16px;
  }

  .user-details {
    display: none;
  }
}

.page-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1rem;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.user-role {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
