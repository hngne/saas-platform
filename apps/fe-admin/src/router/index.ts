import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/auth/LoginView.vue"),
      meta: { guest: true },
    },
    {
      path: "/",
      component: () => import("@/layouts/AdminLayout.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          redirect: "/dashboard",
        },
        {
          path: "dashboard",
          name: "dashboard",
          component: () => import("@/views/dashboard/DashboardView.vue"),
        },
        {
          path: "tenants",
          name: "tenants",
          component: () => import("@/views/tenant/TenantListView.vue"),
        },
        {
          path: "tenants/:id",
          name: "tenant-detail",
          component: () => import("@/views/tenant/TenantDetailView.vue"),
          props: true,
        },
        {
          path: "profile",
          name: "admin-profile",
          component: () => import("@/views/admin/AdminProfileView.vue"),
        },
      ],
    },
  ],
});

// ─── Navigation Guard ──────────────────────────────
router.beforeEach((to, _from) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated()) {
    return { name: "login" };
  }

  if (to.meta.guest && authStore.isAuthenticated()) {
    return { name: "dashboard" };
  }

  return true;
});

export default router;
