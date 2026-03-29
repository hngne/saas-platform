import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
          meta: { title: 'Tổng quan' },
        },
        {
          path: 'categories',
          name: 'Categories',
          component: () => import('@/views/category/CategoryList.vue'),
          meta: { title: 'Danh mục' },
        },
        {
          path: 'attributes',
          name: 'Attributes',
          component: () => import('@/views/attribute/AttributeList.vue'),
          meta: { title: 'Thuộc tính' },
        },
        {
          path: 'products',
          name: 'Products',
          component: () => import('@/views/product/ProductList.vue'),
          meta: { title: 'Sản phẩm' },
        },
        {
          path: 'products/new',
          name: 'ProductCreate',
          component: () => import('@/views/product/ProductForm.vue'),
          meta: { title: 'Thêm sản phẩm' },
        },
        {
          path: 'products/:id/edit',
          name: 'ProductEdit',
          component: () => import('@/views/product/ProductForm.vue'),
          meta: { title: 'Sửa sản phẩm' },
        },
        {
          path: 'products/:id',
          name: 'ProductDetail',
          component: () => import('@/views/product/ProductDetail.vue'),
          meta: { title: 'Chi tiết sản phẩm' },
        },
        {
          path: 'inventory',
          name: 'Inventory',
          component: () => import('@/views/inventory/InventoryList.vue'),
          meta: { title: 'Kho hàng' },
        },
        {
          path: 'inventory/logs',
          name: 'InventoryLogs',
          component: () => import('@/views/inventory/InventoryLogs.vue'),
          meta: { title: 'Lịch sử kho' },
        },
        {
          path: 'shipping',
          name: 'Shipping',
          component: () => import('@/views/shipping/ShippingList.vue'),
          meta: { title: 'Vận chuyển' },
        },
        {
          path: 'vouchers',
          name: 'Vouchers',
          component: () => import('@/views/voucher/VoucherList.vue'),
          meta: { title: 'Voucher' },
        },
        {
          path: 'orders',
          name: 'Orders',
          component: () => import('@/views/order/OrderList.vue'),
          meta: { title: 'Đơn hàng' },
        },
        {
          path: 'orders/:id',
          name: 'OrderDetail',
          component: () => import('@/views/order/OrderDetail.vue'),
          meta: { title: 'Chi tiết đơn hàng' },
        },
        {
          path: 'promotions',
          name: 'Promotions',
          component: () => import('@/views/promotion/PromotionList.vue'),
          meta: { title: 'Khuyến mãi' },
        },
        {
          path: 'promotions/new',
          name: 'PromotionCreate',
          component: () => import('@/views/promotion/PromotionForm.vue'),
          meta: { title: 'Tạo khuyến mãi' },
        },
        {
          path: 'promotions/:id/edit',
          name: 'PromotionEdit',
          component: () => import('@/views/promotion/PromotionForm.vue'),
          meta: { title: 'Sửa khuyến mãi' },
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('@/views/settings/SettingsView.vue'),
          meta: { title: 'Cài đặt' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

// Navigation guards
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.guest && authStore.isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
