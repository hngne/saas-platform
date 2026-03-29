<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
</script>

<template>
  <div class="max-w-2xl">
    <div class="app-card p-6 fade-in-up">
      <div class="flex items-center gap-4 mb-6">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center" style="background: linear-gradient(135deg, #FF6B2B, #FFD700)">
          <i class="pi pi-shopping-bag text-white" style="font-size: 1.6rem"></i>
        </div>
        <div>
          <h2 class="text-xl font-bold" style="color: var(--text-primary)">{{ authStore.tenant?.store_name || 'Cửa hàng' }}</h2>
          <p class="text-sm" style="color: var(--text-muted)">Thông tin cửa hàng của bạn</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-muted)">Slug / Domain</label>
          <p class="font-medium mt-1">{{ authStore.tenant?.slug || '—' }}</p>
        </div>
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-muted)">Loại hình kinh doanh</label>
          <p class="font-medium mt-1">{{ authStore.tenant?.business_type || 'RETAIL' }}</p>
        </div>
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-muted)">Email</label>
          <p class="font-medium mt-1">{{ authStore.user?.email || '—' }}</p>
        </div>
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-muted)">Chủ cửa hàng</label>
          <p class="font-medium mt-1">{{ authStore.user?.name || '—' }}</p>
        </div>
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-muted)">Tenant ID</label>
          <p class="font-mono text-xs mt-1" style="color: var(--text-muted)">{{ authStore.tenant?.id || '—' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
