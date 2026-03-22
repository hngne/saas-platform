<template>
  <div class="min-h-screen bg-[var(--color-background-warm)] flex flex-col font-sans">
    <!-- Navbar -->
    <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-20 relative">
          <div class="flex items-center gap-2 cursor-pointer" @click="$router.push('/')">
            <div class="w-10 h-10 bg-gradient-to-br from-[#FF6B2B] to-[#FFD700] rounded-xl flex items-center justify-center">
              <span class="text-white font-bold text-xl">S</span>
            </div>
            <span class="font-bold text-2xl tracking-tight text-gray-900">Shopflow</span>
          </div>

          <!-- Desktop Navigation -->
          <nav class="hidden md:flex absolute left-1/2 -translate-x-1/2 space-x-10 items-center">
            <a href="#features" class="text-gray-600 hover:text-[#FF6B2B] font-medium transition-colors">Tính năng</a>
            <a href="#about" class="text-gray-600 hover:text-[#FF6B2B] font-medium transition-colors">Về chúng tôi</a>
            <a href="#pricing" class="text-gray-600 hover:text-[#FF6B2B] font-medium transition-colors">Bảng giá</a>
            <router-link to="/login" class="text-gray-600 hover:text-[#FF6B2B] font-medium transition-colors">Đăng nhập</router-link>
          </nav>

          <div class="hidden md:flex items-center gap-4">
            <router-link to="/register" class="bg-gradient-to-r from-[#FF6B2B] to-[#FFD700] text-white px-6 py-2.5 rounded-full font-medium hover:brightness-110 active:scale-95 transition-all shadow-md">
              Tạo cửa hàng miễn phí
            </router-link>
          </div>

          <!-- Mobile menu button -->
          <div class="md:hidden flex items-center">
            <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="text-gray-600 hover:text-gray-900 p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <MenuIcon v-if="!isMobileMenuOpen" class="w-6 h-6" />
              <XIcon v-else class="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Menu with backdrop -->
      <Transition name="mobile-menu">
        <div v-if="isMobileMenuOpen" class="md:hidden absolute top-full left-0 right-0 bg-white shadow-xl border-b border-gray-100 z-40">
          <div class="px-6 py-8 space-y-2">
            <a href="#features" class="flex items-center gap-3 text-gray-800 font-medium py-3 px-4 rounded-xl hover:bg-orange-50 hover:text-[#FF6B2B] transition-colors" @click="isMobileMenuOpen = false">
              <ZapIcon class="w-5 h-5 text-gray-400" />
              Tính năng
            </a>
            <a href="#about" class="flex items-center gap-3 text-gray-800 font-medium py-3 px-4 rounded-xl hover:bg-orange-50 hover:text-[#FF6B2B] transition-colors" @click="isMobileMenuOpen = false">
              <InfoIcon class="w-5 h-5 text-gray-400" />
              Về chúng tôi
            </a>
            <a href="#pricing" class="flex items-center gap-3 text-gray-800 font-medium py-3 px-4 rounded-xl hover:bg-orange-50 hover:text-[#FF6B2B] transition-colors" @click="isMobileMenuOpen = false">
              <TagIcon class="w-5 h-5 text-gray-400" />
              Bảng giá
            </a>
            <router-link to="/login" class="flex items-center gap-3 text-gray-800 font-medium py-3 px-4 rounded-xl hover:bg-orange-50 hover:text-[#FF6B2B] transition-colors" @click="isMobileMenuOpen = false">
              <LogInIcon class="w-5 h-5 text-gray-400" />
              Đăng nhập
            </router-link>
            <div class="pt-4">
              <router-link to="/register" class="block bg-gradient-to-r from-[#FF6B2B] to-[#FFD700] text-white text-center rounded-xl py-3.5 font-bold shadow-lg shadow-orange-200/50 hover:brightness-110 transition-all" @click="isMobileMenuOpen = false">
                Tạo cửa hàng miễn phí
              </router-link>
            </div>
          </div>
        </div>
      </Transition>
    </header>

    <!-- Backdrop overlay -->
    <Transition name="fade">
      <div v-if="isMobileMenuOpen" class="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" @click="isMobileMenuOpen = false"></div>
    </Transition>

    <!-- Main Content -->
    <main class="flex-grow">
      <slot></slot>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white pt-16 pb-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div class="col-span-1 md:col-span-2">
            <div class="flex items-center gap-2 mb-6">
              <div class="w-8 h-8 bg-gradient-to-br from-[#FF6B2B] to-[#FFD700] rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-lg">S</span>
              </div>
              <span class="font-bold text-xl tracking-tight">Shopflow</span>
            </div>
            <p class="text-gray-400 max-w-sm mb-6">
              Giải pháp quản lý bán hàng đa kênh dành cho các doanh nghiệp bán lẻ hiện đại tại Việt Nam.
            </p>
          </div>
          <div>
            <h3 class="font-semibold text-white mb-4">Sản phẩm</h3>
            <ul class="space-y-3">
              <li><a href="#features" class="text-gray-400 hover:text-white transition-colors">Tính năng</a></li>
              <li><a href="#pricing" class="text-gray-400 hover:text-white transition-colors">Bảng giá</a></li>
              <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Giải pháp</a></li>
            </ul>
          </div>
          <div>
            <h3 class="font-semibold text-white mb-4">Hỗ trợ</h3>
            <ul class="space-y-3">
              <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Tài liệu</a></li>
              <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Liên hệ</a></li>
              <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Blog</a></li>
            </ul>
          </div>
        </div>
        <div class="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
          <p>&copy; 2026 Shopflow SaaS Platform. All rights reserved.</p>
          <div class="flex gap-6 mt-4 md:mt-0">
            <a href="#" class="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" class="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MenuIcon, XIcon, ZapIcon, TagIcon, LogInIcon, InfoIcon } from 'lucide-vue-next'

const isMobileMenuOpen = ref(false)
</script>

<style scoped>
/* Mobile menu slide transition */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Backdrop fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
