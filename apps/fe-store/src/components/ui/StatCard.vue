<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  icon: string
  trend?: number
  color?: string
}>()
</script>

<template>
  <div class="stat-card fade-in-up">
    <div class="stat-header">
      <div class="stat-icon-wrap" :style="{ background: `${color || '#FF6B2B'}15` }">
        <i :class="icon" :style="{ color: color || '#FF6B2B' }"></i>
      </div>
      <span v-if="trend !== undefined" class="stat-trend" :class="trend >= 0 ? 'up' : 'down'">
        <i :class="trend >= 0 ? 'pi pi-arrow-up-right' : 'pi pi-arrow-down-right'" style="font-size: 0.65rem"></i>
        {{ Math.abs(trend) }}%
      </span>
    </div>
    <div class="stat-value">{{ value }}</div>
    <div class="stat-title">{{ title }}</div>
  </div>
</template>

<style scoped>
.stat-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  border: 1px solid var(--border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}
.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.stat-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}
.stat-trend {
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 8px;
  border-radius: 20px;
}
.stat-trend.up {
  color: #10B981;
  background: #ECFDF5;
}
.stat-trend.down {
  color: #EF4444;
  background: #FEF2F2;
}
.stat-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}
.stat-title {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 4px;
}
</style>
