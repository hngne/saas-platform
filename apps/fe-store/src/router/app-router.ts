import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, savedPosition) {
    if (to.hash) {
      return { el: to.hash, top: 0 }
    }

    return savedPosition || { top: 0, left: 0 }
  },
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
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
          meta: { title: 'Tổng quan' },
        },
        {
          path: 'stores',
          name: 'Stores',
          component: () => import('@/views/store/StoreListPage.vue'),
          meta: { title: 'Cửa hàng' },
        },
        {
          path: 'products',
          name: 'Products',
          component: () => import('@/views/product/ProductList.vue'),
          meta: { title: 'Sản phẩm' },
        },
        {
          path: 'staff',
          name: 'Staff',
          component: () => import('@/views/staff/StaffListPage.vue'),
          meta: { title: 'Nhân viên' },
        },
        {
          path: 'customers',
          name: 'Customers',
          component: () => import('@/views/customer/CustomerListPage.vue'),
          meta: { title: 'Người dùng' },
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
          component: () => import('@/views/product/ProductDetailView.vue'),
          meta: { title: 'Chi tiết sản phẩm' },
        },
        {
          path: 'categories',
          name: 'Categories',
          component: () => import('@/views/category/CategoryList.vue'),
          meta: { title: 'Danh mục' },
        },
        {
          path: 'categories/:id/edit',
          name: 'CategoryEdit',
          component: () => import('@/views/category/CategoryEdit.vue'),
          meta: { title: 'Chỉnh sửa danh mục' },
        },
        {
          path: 'attributes',
          name: 'Attributes',
          component: () => import('@/views/attribute/AttributeList.vue'),
          meta: { title: 'Thuộc tính' },
        },
        {
          path: 'attributes/:id/edit',
          name: 'AttributeEdit',
          component: () => import('@/views/attribute/AttributeEdit.vue'),
          meta: { title: 'Chỉnh sửa thuộc tính' },
        },
        {
          path: 'inventory',
          name: 'Inventory',
          component: () => import('@/views/inventory/InventoryList.vue'),
          meta: { title: 'Quản lý tồn kho' },
        },
        {
          path: 'inventory/logs',
          name: 'InventoryLogs',
          component: () => import('@/views/inventory/InventoryLogs.vue'),
          meta: { title: 'Lịch sử tồn kho' },
        },
        {
          path: 'shipping',
          name: 'Shipping',
          component: () => import('@/views/shipping/ShippingList.vue'),
          meta: { title: 'Vận chuyển' },
        },
        {
          path: 'orders',
          name: 'Orders',
          component: () => import('@/views/order/OrderListPage.vue'),
          meta: { title: 'Đơn hàng' },
        },
        {
          path: 'orders/:id',
          name: 'OrderDetail',
          component: () => import('@/views/order/OrderDetailPage.vue'),
          meta: { title: 'Chi tiết đơn hàng' },
        },
        {
          path: 'vouchers',
          name: 'Vouchers',
          component: () => import('@/views/voucher/VoucherOverviewPage.vue'),
          meta: { title: 'Voucher' },
        },
        {
          path: 'promotions',
          name: 'Promotions',
          component: () => import('@/views/promotion/PromotionOverviewPage.vue'),
          meta: { title: 'Khuyến mãi' },
        },
        {
          path: 'promotions/new',
          name: 'PromotionCreate',
          component: () => import('@/views/promotion/PromotionEditorPage.vue'),
          meta: { title: 'Tạo khuyến mãi' },
        },
        {
          path: 'promotions/:id/edit',
          name: 'PromotionEdit',
          component: () => import('@/views/promotion/PromotionEditorPage.vue'),
          meta: { title: 'Sửa khuyến mãi' },
        },
        {
          path: 'blog/categories',
          name: 'BlogCategories',
          component: () => import('@/views/blog/BlogCategoryListPage.vue'),
          meta: { title: 'Danh mục blog' },
        },
        {
          path: 'blog/posts',
          name: 'BlogPosts',
          component: () => import('@/views/blog/BlogPostListPage.vue'),
          meta: { title: 'Bài viết blog' },
        },
        {
          path: 'blog/posts/new',
          name: 'BlogPostCreate',
          component: () => import('@/views/blog/BlogPostEditorPage.vue'),
          meta: { title: 'Tạo bài viết blog' },
        },
        {
          path: 'blog/posts/:id/edit',
          name: 'BlogPostEdit',
          component: () => import('@/views/blog/BlogPostEditorPage.vue'),
          meta: { title: 'Sửa bài viết blog' },
        },
        {
          path: 'ai-chat',
          name: 'AiChat',
          component: () => import('@/views/chat/AiChatView.vue'),
          meta: { title: 'Trợ lý AI' },
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

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.hasBootstrapped) {
    await authStore.bootstrapAuth()
  } else if (to.meta.requiresAuth && !authStore.hasValidAccessToken) {
    await authStore.bootstrapAuth(true)
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }

  if (to.meta.guest && authStore.isAuthenticated) {
    return '/dashboard'
  }

  return true
})

export default router
