<script setup lang="ts">
import { nextTick, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebarModern.vue'
import AppHeader from '@/components/layout/AppHeader.vue'

const route = useRoute()
const mainContentRef = ref<HTMLElement | null>(null)
const sidebarOpen = ref(false)
const desktopCollapsed = ref(false)
const isTablet = ref(false)
const isMobile = ref(false)

const checkScreen = () => {
  const w = window.innerWidth
  isMobile.value = w < 769
  isTablet.value = w >= 769 && w <= 1024
}

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const toggleDesktopCollapse = () => {
  desktopCollapsed.value = !desktopCollapsed.value
}

const closeSidebar = () => {
  sidebarOpen.value = false
}

watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    mainContentRef.value?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  },
)

onMounted(() => {
  checkScreen()
  window.addEventListener('resize', checkScreen)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkScreen)
})
</script>

<template>
  <div class="layout-wrapper">
    <!-- Mobile overlay -->
    <Transition name="overlay">
      <div
        v-if="sidebarOpen && (isMobile || isTablet)"
        class="sidebar-overlay"
        @click="closeSidebar"
      ></div>
    </Transition>

    <!-- Sidebar -->
    <aside
      class="sidebar-container"
      :class="{
        'is-mobile': isMobile,
        'is-tablet': isTablet,
        'mobile-open': sidebarOpen && isMobile,
        'tablet-open': sidebarOpen && isTablet,
        'desktop-collapsed': !isMobile && !isTablet && desktopCollapsed
      }"
    >
      <AppSidebar
        :collapsed="(isTablet && !sidebarOpen) || (!isMobile && !isTablet && desktopCollapsed)"
        @navigate="closeSidebar"
        @toggle-collapse="toggleDesktopCollapse"
      />
    </aside>

    <!-- Main Content -->
    <div class="main-container">
      <AppHeader
        :show-menu-btn="isMobile || isTablet"
        @toggle-sidebar="toggleSidebar"
      />

      <main ref="mainContentRef" class="main-content">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
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

/* ── Sidebar ─────────────────────── */
.sidebar-container {
  flex-shrink: 0;
  width: var(--sidebar-width, 260px);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-container.desktop-collapsed {
  width: var(--sidebar-collapsed, 68px);
}

/* Mobile: off-canvas */
.sidebar-container.is-mobile {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 50;
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar-container.is-mobile.mobile-open {
  transform: translateX(0);
}

/* Tablet: collapsed icon-only */
.sidebar-container.is-tablet {
  width: var(--sidebar-collapsed);
}

.sidebar-container.is-tablet.tablet-open {
  width: var(--sidebar-width);
  position: relative;
  z-index: 45;
}

/* Overlay */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 40;
}

/* ── Main ────────────────────────── */
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

@media (max-width: 768px) {
  .main-content { padding: 16px; }
}
@media (min-width: 769px) and (max-width: 1024px) {
  .main-content { padding: 20px; }

  .sidebar-container.is-tablet.tablet-open {
    box-shadow: 18px 0 38px rgba(15, 23, 42, 0.12);
  }
}

/* ── Transitions ─────────────────── */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.page-enter-active {
  animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.page-leave-active {
  animation: fadeOut 0.15s ease both;
}
@keyframes fadeOut {
  to { opacity: 0; }
}
</style>
