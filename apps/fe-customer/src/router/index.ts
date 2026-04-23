import { createRouter, createWebHistory } from "vue-router";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0, left: 0 };
  },
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
    },
    {
      path: "/products",
      name: "products",
      component: () => import("@/views/ProductCatalogView.vue"),
      meta: { mode: "all" },
    },
    {
      path: "/products/:slug",
      name: "product-detail",
      component: () => import("@/views/ProductDetailView.vue"),
    },
    {
      path: "/categories/:slug",
      name: "category-products",
      component: () => import("@/views/ProductCatalogView.vue"),
      meta: { mode: "category" },
    },
    {
      path: "/search",
      name: "search",
      component: () => import("@/views/ProductCatalogView.vue"),
      meta: { mode: "search" },
    },
    {
      path: "/blog",
      name: "blog",
      component: () => import("@/views/BlogListView.vue"),
    },
    {
      path: "/blog/:slug",
      name: "blog-detail",
      component: () => import("@/views/BlogDetailView.vue"),
    },
    {
      path: "/cart",
      name: "cart",
      component: () => import("@/views/CartView.vue"),
    },
    {
      path: "/checkout",
      name: "checkout",
      component: () => import("@/views/CheckoutView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/checkout/success",
      name: "order-success",
      component: () => import("@/views/OrderSuccessView.vue"),
      meta: { bare: true },
    },
    {
      path: "/payment/result",
      name: "payment-result",
      component: () => import("@/views/OrderSuccessView.vue"),
      meta: { bare: true },
    },
    {
      path: "/account/addresses",
      name: "address-book",
      component: () => import("@/views/AccountAddressesView.vue"),
      meta: { bare: true, requiresAuth: true },
    },
    {
      path: "/checkout/addresses",
      name: "checkout-address-book",
      component: () => import("@/views/AddressBookView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/account",
      name: "account-dashboard",
      component: () => import("@/views/AccountDashboardView.vue"),
      meta: { bare: true, requiresAuth: true },
    },
    {
      path: "/account/profile",
      name: "account-profile",
      component: () => import("@/views/AccountProfileView.vue"),
      meta: { bare: true, requiresAuth: true },
    },
    {
      path: "/account/orders",
      name: "account-orders",
      component: () => import("@/views/AccountOrdersView.vue"),
      meta: { bare: true, requiresAuth: true },
    },
    {
      path: "/account/orders/:id",
      name: "account-order-detail",
      component: () => import("@/views/OrderDetailView.vue"),
      meta: { bare: true, requiresAuth: true },
    },
    {
      path: "/account/orders/:id/review",
      name: "order-review",
      component: () => import("@/views/ReviewProductView.vue"),
      meta: { bare: true, requiresAuth: true },
    },
    {
      path: "/checkout/pickup",
      name: "pickup-select",
      component: () => import("@/views/PickupSelectView.vue"),
    },
    {
      path: "/stores",
      name: "store-locator",
      component: () => import("@/views/StoreLocatorView.vue"),
    },
    {
      path: "/support",
      name: "support-chat",
      component: () => import("@/views/SupportChatView.vue"),
      meta: { bare: true, requiresAuth: true },
    },
    {
      path: "/account/notifications",
      name: "account-notifications",
      component: () => import("@/views/NotificationsView.vue"),
      meta: { bare: true, requiresAuth: true },
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
      meta: { bare: true },
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/views/RegisterView.vue"),
      meta: { bare: true },
    },
    {
      path: "/forgot-password",
      name: "forgot-password",
      component: () => import("@/views/ForgotPasswordView.vue"),
      meta: { bare: true },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/views/NotFoundView.vue"),
      meta: { bare: true },
    },
  ],
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true;
  const auth = useCustomerAuthStore();
  const isAuthenticated = await auth.bootstrapAuth();
  if (isAuthenticated) return true;
  return { name: "login", query: { redirect: to.fullPath } };
});

export default router;
