<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();
const router = useRouter();
const sidebarCollapsed = ref(false);
const mobileMenuOpen = ref(false);

const MOBILE_BREAKPOINT = 1024;
const isMobile = ref(window.innerWidth < MOBILE_BREAKPOINT);

const handleResize = () => {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    sidebarCollapsed.value = false;
  }
};

const menuItems = [
  { label: "Dashboard", icon: "pi pi-objects-column", route: "/dashboard" },
  { label: "Tenants Management", icon: "pi pi-building", route: "/tenants" },
];

onMounted(async () => {
  window.addEventListener("resize", handleResize);
  if (!authStore.admin) {
    try {
      await authStore.fetchProfile();
    } catch {
      authStore.clearAuth();
      router.push("/login");
    }
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

const handleLogout = async () => {
  await authStore.logout();
  router.push("/login");
};
</script>

<template>
  <div class="layout-root">

    <!-- Mobile Overlay -->
    <Transition name="fade">
      <div
        v-if="mobileMenuOpen"
        class="mobile-overlay"
        @click="mobileMenuOpen = false"
      />
    </Transition>

    <!-- ===== Sidebar ===== -->
    <aside
      class="sidebar"
      :class="{
        'sidebar--collapsed': sidebarCollapsed,
        'sidebar--open': mobileMenuOpen
      }"
    >
      <!-- Sidebar Header -->
      <div class="sidebar-header" :class="{ 'sidebar-header--collapsed': sidebarCollapsed && !isMobile }">

        <!-- Brand (expanded) -->
        <div v-if="!sidebarCollapsed || isMobile" class="sidebar-brand">
          <div class="brand-icon">
            <i class="pi pi-sparkles"></i>
          </div>
          <div class="brand-text">
            <span class="brand-title">SuperAdmin CMS</span>
            <span class="brand-sub">Management Portal</span>
          </div>
        </div>

        <!-- Desktop collapse toggle -->
        <button class="sidebar-toggle-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          <i :class="sidebarCollapsed ? 'pi pi-bars' : 'pi pi-angle-left'"></i>
        </button>

        <!-- Mobile close -->
        <button class="sidebar-close-btn" @click="mobileMenuOpen = false">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- Nav Menu -->
      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in menuItems"
          :key="item.route"
          :to="item.route"
          class="nav-item"
          :class="{ 'nav-item--collapsed': sidebarCollapsed && !isMobile }"
          active-class="nav-item--active"
          @click="mobileMenuOpen = false"
        >
          <i :class="item.icon" class="nav-icon"></i>
          <span v-if="!sidebarCollapsed || isMobile" class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- Logout -->
      <div class="sidebar-footer">
        <button
          class="logout-btn"
          :class="{ 'logout-btn--collapsed': sidebarCollapsed && !isMobile }"
          @click="handleLogout"
        >
          <i class="pi pi-sign-out nav-icon"></i>
          <span v-if="!sidebarCollapsed || isMobile" class="nav-label">Đăng xuất</span>
        </button>
      </div>
    </aside>

    <!-- ===== Main Content ===== -->
    <div
      class="layout-main"
      :class="{ 'layout-main--collapsed': sidebarCollapsed }"
    >
      <!-- Topbar -->
      <header class="topbar">

        <!-- Mobile hamburger -->
        <button class="topbar-hamburger" @click="mobileMenuOpen = true">
          <i class="pi pi-bars"></i>
        </button>

        <!-- Search -->
        <div class="topbar-search">
          <i class="pi pi-search topbar-search-icon"></i>
          <input
            type="text"
            placeholder="Tìm kiếm toàn cục..."
            class="topbar-search-input"
          />
        </div>

        <!-- Right: bell + profile -->
        <div class="topbar-right" v-if="authStore.admin">
          <button class="topbar-icon-btn">
            <i class="pi pi-bell"></i>
          </button>

          <div class="topbar-divider"></div>

          <RouterLink to="/profile" class="topbar-profile">
            <div class="topbar-profile-text">
              <span class="topbar-profile-name">{{ authStore.admin.name || 'Admin' }}</span>
              <span class="topbar-profile-role">Super Admin</span>
            </div>
            <div class="topbar-avatar">
              <img
                :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(authStore.admin.name || 'Admin')}&background=eef2ff&color=4f46e5`"
                alt="Avatar"
                class="topbar-avatar-img"
              />
            </div>
          </RouterLink>
        </div>
      </header>

      <!-- Page content -->
      <main class="layout-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   ROOT
   ============================================ */
.layout-root {
  display: flex;
  min-height: 100vh;
  overflow-x: hidden;
  background: #f8fafc;
}

/* ============================================
   MOBILE OVERLAY
   ============================================ */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0; /* fix: thay inset-y bằng top/bottom/left/right */
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 40;
}

@media (min-width: 1024px) {
  .mobile-overlay {
    display: none;
  }
}

/* ============================================
   SIDEBAR
   ============================================ */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0; /* fix: thay inset-y bằng top/bottom */
  z-index: 50;
  width: 256px;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  transition: width 0.3s ease, transform 0.3s ease;
  overflow: hidden;
}

/* Desktop collapsed */
.sidebar--collapsed {
  width: 72px;
}

/* Mobile */
@media (max-width: 1023px) {
  .sidebar {
    width: 260px;
    transform: translateX(-100%);
  }
  .sidebar--open {
    transform: translateX(0);
  }
  .sidebar--collapsed {
    width: 260px;
    transform: translateX(-100%);
  }
  .sidebar--collapsed.sidebar--open {
    transform: translateX(0);
  }
}

/* --- Header --- */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  min-height: 64px;
  flex-shrink: 0;
  gap: 0.5rem;
}

.sidebar-header--collapsed {
  justify-content: center;
  padding: 1.1rem 0.5rem;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.brand-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #4f46e5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.brand-icon--center {
  margin: 0 auto;
}

.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.brand-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #f1f5f9;
  white-space: nowrap;
  line-height: 1.25;
}

.brand-sub {
  font-size: 0.62rem;
  color: #475569;
  white-space: nowrap;
  margin-top: 1px;
}

/* Toggle (desktop only) */
.sidebar-toggle-btn {
  display: none;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: #475569;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.sidebar-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
}

@media (min-width: 1024px) {
  .sidebar-toggle-btn {
    display: flex;
  }
}

/* Close (mobile only) */
.sidebar-close-btn {
  display: flex;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: #475569;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.sidebar-close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
}

@media (min-width: 1024px) {
  .sidebar-close-btn {
    display: none;
  }
}

/* --- Nav --- */
.sidebar-nav {
  flex: 1;
  padding: 0.75rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.855rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  transition: background 0.15s, color 0.15s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #f1f5f9;
}

.nav-item--active {
  background: #4f46e5 !important;
  color: #fff !important;
}

.nav-item--active:hover {
  background: #4338ca !important;
}

.nav-item--collapsed {
  justify-content: center;
  padding: 0.6rem;
  gap: 0;
  /* Khi collapsed: active background chỉ bao icon, không full width */
  width: 44px;
  height: 44px;
  margin-left: auto;
  margin-right: auto;
  border-radius: 12px;
}

.nav-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.nav-label {
  font-size: 0.855rem;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
}

/* --- Footer --- */
.sidebar-footer {
  padding: 0.6rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 0.855rem;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  transition: background 0.15s, color 0.15s;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}

.logout-btn--collapsed {
  justify-content: center;
  padding: 0.6rem;
  gap: 0;
  width: 44px;
  height: 44px;
  margin-left: auto;
  margin-right: auto;
  border-radius: 12px;
}

/* ============================================
   MAIN
   ============================================ */
.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 0;
  margin-left: 256px;
  transition: margin-left 0.3s ease;
}

.layout-main--collapsed {
  margin-left: 72px;
}

@media (max-width: 1023px) {
  .layout-main,
  .layout-main--collapsed {
    margin-left: 0;
  }
}

/* ============================================
   TOPBAR
   ============================================ */
.topbar {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 30;
  gap: 1rem;
  flex-shrink: 0;
}

.topbar-hamburger {
  display: none;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.topbar-hamburger:hover {
  background: #f1f5f9;
  color: #0f172a;
}

@media (max-width: 1023px) {
  .topbar-hamburger {
    display: flex;
  }
}

.topbar-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 340px;
}

.topbar-search-icon {
  color: #94a3b8;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.topbar-search-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  color: #334155;
  width: 100%;
  min-width: 0;
}

.topbar-search-input::placeholder {
  color: #94a3b8;
}

@media (max-width: 480px) {
  .topbar-search {
    display: none;
  }
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.topbar-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: background 0.15s, color 0.15s;
}

.topbar-icon-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.topbar-divider {
  width: 1px;
  height: 24px;
  background: #e2e8f0;
}

@media (max-width: 640px) {
  .topbar-divider {
    display: none;
  }
}

.topbar-profile {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.3rem 0.4rem 0.3rem 0.6rem;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.15s;
}

.topbar-profile:hover {
  background: #f8fafc;
}

.topbar-profile-text {
  display: flex;
  flex-direction: column;
  text-align: right;
}

@media (max-width: 640px) {
  .topbar-profile-text {
    display: none;
  }
}

.topbar-profile-name {
  font-size: 0.845rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.25;
  white-space: nowrap;
}

.topbar-profile-role {
  font-size: 0.68rem;
  color: #94a3b8;
  margin-top: 1px;
}

.topbar-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #e2e8f0; /* fix: thay 'ring' bằng border */
}

.topbar-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ============================================
   CONTENT
   ============================================ */
.layout-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  min-width: 0;
}

@media (min-width: 640px) {
  .layout-content {
    padding: 2rem;
  }
}

@media (min-width: 1024px) {
  .layout-content {
    padding: 2rem 2.5rem;
  }
}

/* ============================================
   TRANSITIONS
   ============================================ */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>