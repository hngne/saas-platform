<script setup lang="ts">
defineProps<{
  icon?: string
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="empty-state">
    <i :class="icon || 'pi pi-inbox'" class="empty-icon"></i>
    <h3 class="empty-title">{{ title || 'Không có dữ liệu' }}</h3>
    <p class="empty-desc">{{ description || 'Chưa có dữ liệu nào được tạo.' }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}
.empty-icon {
  font-size: 3rem;
  color: #d1d5db;
  margin-bottom: 16px;
}
.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.empty-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
}
</style>
