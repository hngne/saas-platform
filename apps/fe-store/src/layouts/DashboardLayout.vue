<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'

const sidebarOpen = ref(false)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebar = () => {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="layout-wrapper">
    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      class="sidebar-overlay"
      @click="closeSidebar"
    ></div>

    <!-- Sidebar -->
    <div class="sidebar-container" :class="{ open: sidebarOpen }">
      <AppSidebar @navigate="closeSidebar" />
    </div>

    <!-- Main Content -->
    <div class="main-container">
      <AppHeader @toggle-sidebar="toggleSidebar" />

      <main class="main-content">
        <RouterView v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout-wrapper {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar-container {
  flex-shrink: 0;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background-color: var(--bg-page);
}

.sidebar-overlay {
  display: none;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .sidebar-container {
    position: fixed;
    left: -260px;
    top: 0;
    z-index: 50;
    transition: left 0.3s ease;
  }

  .sidebar-container.open {
    left: 0;
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 40;
  }

  .main-content {
    padding: 16px;
  }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .main-content {
    padding: 20px;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
