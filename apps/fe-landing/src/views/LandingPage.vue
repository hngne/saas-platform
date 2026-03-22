<template>
  <MainLayout>
    <!-- Hero Section -->
    <section class="pt-20 pb-24 md:pt-28 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div class="grid lg:grid-cols-2 gap-12 items-center">
        <!-- Left Content -->
        <div class="flex flex-col text-left reveal">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-600 font-medium text-sm w-fit mb-6">
            <ZapIcon class="w-4 h-4" /> Nền tảng SaaS bán lẻ #1 Việt Nam
          </div>
          <h1 class="text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-6">
            Quản lý cửa hàng thông minh — <br/>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B2B] to-[#FFD700] italic">Bán hàng không giới hạn</span>
          </h1>
          <p class="text-lg text-gray-600 mb-10 max-w-lg leading-relaxed">
            Tạo website bán hàng riêng, quản lý đơn hàng, kho hàng và chatbot AI chỉ trong 30 giây. Giải pháp toàn diện cho nhà bán lẻ hiện đại.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <router-link to="/register" class="bg-gradient-to-r from-[#FF6B2B] to-[#FFD700] text-white px-8 py-4 rounded-full font-bold hover:brightness-110 active:scale-95 transition-all text-center shadow-lg shadow-orange-500/30">
              Bắt đầu miễn phí
            </router-link>
            <router-link to="/register" class="bg-white text-gray-900 px-8 py-4 rounded-full font-bold border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition-all text-center">
              Xem demo
            </router-link>
          </div>
        </div>

        <!-- Right Content: Dashboard Mockup -->
        <div class="relative w-full reveal reveal-delay-2">
          <div class="absolute inset-0 bg-gradient-to-br from-[#FF6B2B]/20 to-[#FFD700]/20 rounded-[2.5rem] blur-2xl transform -rotate-3 scale-105"></div>
          <div class="relative bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100">
            <!-- Mockup Header -->
            <div class="flex justify-between items-start mb-8">
              <div>
                <p class="text-sm text-gray-500 font-medium mb-1">Tổng doanh thu</p>
                <h3 class="text-3xl font-bold text-gray-900">₫24,500,000</h3>
              </div>
              <div class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                <TrendingUpIcon class="w-4 h-4" /> +12.5%
              </div>
            </div>
            
            <!-- Mockup Cards -->
            <div class="grid grid-cols-2 gap-4 mb-8">
              <div class="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                <div class="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-3">
                  <BotIcon class="w-5 h-5" />
                </div>
                <p class="text-sm text-gray-500 mb-1">Đơn hàng</p>
                <p class="text-xl font-bold">142</p>
              </div>
              <div class="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                <div class="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center mb-3">
                  <LayoutDashboardIcon class="w-5 h-5" />
                </div>
                <p class="text-sm text-gray-500 mb-1">Sản phẩm</p>
                <p class="text-xl font-bold">89</p>
              </div>
            </div>
            
            <!-- Fake Chart Area -->
            <div class="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-4 flex items-center justify-between border border-orange-100/50">
               <div class="flex items-center gap-3">
                 <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                 <span class="text-sm font-medium text-gray-700">+24.5M Doanh thu hôm nay</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Trust Bar -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24 reveal">
      <div class="bg-[#FFF3EC] rounded-[2rem] py-12 px-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-orange-200/50">
          <div class="flex flex-col items-center justify-center pt-4 md:pt-0">
            <span class="text-4xl font-extrabold text-[#FF6B2B] mb-2">500+</span>
            <span class="text-[#B95D3C] font-medium text-sm">Cửa hàng</span>
          </div>
          <div class="flex flex-col items-center justify-center pt-4 md:pt-0">
            <span class="text-4xl font-extrabold text-[#FF6B2B] mb-2">10,000+</span>
            <span class="text-[#B95D3C] font-medium text-sm">Đơn hàng</span>
          </div>
          <div class="flex flex-col items-center justify-center pt-4 md:pt-0">
            <span class="text-4xl font-extrabold text-[#FF6B2B] mb-2">99.9%</span>
            <span class="text-[#B95D3C] font-medium text-sm">Uptime</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-20 reveal">
        <h2 class="text-[#FF6B2B] tracking-widest uppercase mb-4 text-sm font-bold">Tính năng đột phá</h2>
        <h3 class="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">Giải pháp bán hàng toàn diện</h3>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="group bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 reveal reveal-delay-1">
          <div class="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-[#FF6B2B] mb-8 group-hover:scale-110 transition-transform">
            <GlobeIcon class="w-8 h-8" />
          </div>
          <h4 class="text-xl font-bold text-gray-900 mb-4">Website riêng theo subdomain</h4>
          <p class="text-gray-600 leading-relaxed">
            Mỗi cửa hàng có website riêng chuyên nghiệp tại yourshop.shopflow.vn
          </p>
        </div>
        
        <div class="group bg-white p-10 rounded-[2.5rem] border-2 border-[#FF6B2B]/10 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 md:scale-105 bg-gradient-to-b from-white to-orange-50/30 reveal reveal-delay-2">
          <div class="w-16 h-16 bg-[#FF6B2B] rounded-2xl flex items-center justify-center text-white mb-8 group-hover:rotate-6 transition-transform">
            <ZapIcon class="w-8 h-8" />
          </div>
          <h4 class="text-xl font-bold text-gray-900 mb-4">Quản lý kho & đơn hàng real-time</h4>
          <p class="text-gray-600 leading-relaxed">
            Theo dõi tồn kho, xử lý đơn hàng nhanh chóng và chính xác tuyệt đối.
          </p>
        </div>
        
        <div class="group bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 reveal reveal-delay-3">
          <div class="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center text-[#FFD700] mb-8 group-hover:scale-110 transition-transform">
            <BotIcon class="w-8 h-8" />
          </div>
          <h4 class="text-xl font-bold text-gray-900 mb-4">Chatbot AI tư vấn sản phẩm</h4>
          <p class="text-gray-600 leading-relaxed">
            Gemini AI tự động tư vấn khách hàng, chốt đơn 24/7 không cần nghỉ ngơi.
          </p>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="py-24 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16 reveal">
          <h2 class="text-[#FF6B2B] font-bold uppercase text-sm tracking-widest mb-4">Quy trình đơn giản</h2>
          <h3 class="text-4xl font-bold text-gray-900">Chỉ mất 2 phút để đưa cửa hàng của bạn lên môi trường số.</h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <div class="relative z-10 flex flex-col items-center text-center reveal reveal-delay-1">
             <div class="w-20 h-20 bg-white border-2 border-[#FF6B2B] rounded-full flex items-center justify-center text-4xl font-bold text-[#FF6B2B] mb-6 shadow-lg shadow-orange-100">1</div>
             <h4 class="text-xl font-bold mb-3">Đăng ký tạo cửa hàng</h4>
             <p class="text-gray-600">Chỉ mất 30 giây để thiết lập thông tin cơ bản.</p>
          </div>
          <div class="relative z-10 flex flex-col items-center text-center reveal reveal-delay-2">
             <div class="w-20 h-20 bg-white border-2 border-[#FF6B2B] rounded-full flex items-center justify-center text-4xl font-bold text-[#FF6B2B] mb-6 shadow-lg shadow-orange-100">2</div>
             <h4 class="text-xl font-bold mb-3">Thiết lập sản phẩm</h4>
             <p class="text-gray-600">Tải lên hình ảnh và tùy chỉnh giao diện kéo thả.</p>
          </div>
          <div class="relative z-10 flex flex-col items-center text-center reveal reveal-delay-3">
             <div class="w-20 h-20 bg-[#FF6B2B] rounded-full flex items-center justify-center text-4xl font-bold text-white mb-6 shadow-lg shadow-orange-200">3</div>
             <h4 class="text-xl font-bold mb-3">Bắt đầu nhận đơn</h4>
             <p class="text-gray-600">Quản lý và bùng nổ doanh số ngay lập tức.</p>
          </div>

          <div class="hidden md:block absolute top-10 left-[30%] right-[30%] h-0.5 border-t-2 border-dashed border-gray-200 -z-0"></div>
        </div>
      </div>
    </section>

    <!-- About Us Section -->
    <section id="about" class="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid lg:grid-cols-2 gap-16 items-center">
        <div class="relative reveal">
          <div class="absolute -top-10 -left-10 w-40 h-40 bg-orange-100/50 rounded-full blur-3xl -z-10"></div>
          <img src="@/assets/about-us.png" alt="About Shopflow" class="rounded-[2.5rem] shadow-2xl border border-gray-100 relative z-10" />
          <div class="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 z-20 hidden md:block">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center font-bold text-xl">100%</div>
              <div>
                <p class="font-bold text-gray-900 leading-tight">Cam kết đồng hành</p>
                <p class="text-sm text-gray-500">Cùng sự nghiệp bán lẻ của bạn</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="reveal reveal-delay-2">
          <h2 class="text-[#FF6B2B] font-bold uppercase text-sm tracking-widest mb-4">Về chúng tôi</h2>
          <h3 class="text-4xl font-bold text-gray-900 mb-6 leading-tight">Sứ mệnh nâng tầm ngành bán lẻ Việt Nam</h3>
          <p class="text-lg text-gray-600 mb-8 leading-relaxed">
            Shopflow ra đời với khát vọng số hóa mọi cửa hàng bán lẻ truyền thống. Chúng tôi cung cấp giải pháp công nghệ hiện đại, dễ sử dụng, giúp các chủ shop tối ưu vận hành và bùng nổ doanh số trong kỷ nguyên số.
          </p>
          
          <div class="grid gap-6">
            <div class="flex gap-4">
              <div class="w-12 h-12 bg-orange-50 text-[#FF6B2B] rounded-xl flex items-center justify-center shrink-0">
                <UsersIcon class="w-6 h-6" />
              </div>
              <div>
                <h4 class="font-bold text-gray-900 mb-1">Khách hàng là trọng tâm</h4>
                <p class="text-gray-600">Chúng tôi lắng nghe và thấu hiểu từng nhu cầu nhỏ nhất của nhà bán lẻ.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="w-12 h-12 bg-orange-50 text-[#FF6B2B] rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheckIcon class="w-6 h-6" />
              </div>
              <div>
                <h4 class="font-bold text-gray-900 mb-1">Tin cậy & Bảo mật</h4>
                <p class="text-gray-600">Dữ liệu kinh doanh của bạn luôn được bảo vệ an toàn tuyệt đối với công nghệ đám mây.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="w-12 h-12 bg-orange-50 text-[#FF6B2B] rounded-xl flex items-center justify-center shrink-0">
                <StarIcon class="w-6 h-6" />
              </div>
              <div>
                <h4 class="font-bold text-gray-900 mb-1">Đổi mới không ngừng</h4>
                <p class="text-gray-600">Luôn cập nhật những xu hướng công nghệ mới nhất như AI, Data Analytics.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16 reveal">
        <h2 class="text-[#FF6B2B] font-bold uppercase text-sm tracking-widest mb-4">Bảng giá dịch vụ</h2>
        <h3 class="text-4xl font-bold text-gray-900">Lựa chọn gói phù hợp với bạn</h3>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Trial Plan -->
        <div class="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col reveal reveal-delay-1">
          <h4 class="text-xl font-bold mb-2">Dùng thử</h4>
          <div class="flex items-baseline mb-6">
            <span class="text-4xl font-bold">₫0</span>
            <span class="text-gray-500 ml-1">/tháng</span>
          </div>
          <ul class="space-y-4 mb-8 flex-grow">
            <li class="flex items-center gap-2 text-gray-600 italic"><CheckCircleIcon class="w-5 h-5 text-[#FF6B2B] shrink-0" /> 14 ngày trải nghiệm</li>
            <li class="flex items-center gap-2 text-gray-600"><CheckCircleIcon class="w-5 h-5 text-[#FF6B2B] shrink-0" /> Đầy đủ tính năng cơ bản</li>
            <li class="flex items-center gap-2 text-gray-600"><CheckCircleIcon class="w-5 h-5 text-[#FF6B2B] shrink-0" /> Subdomain .shopflow.io</li>
          </ul>
          <router-link to="/register" class="w-full py-4 text-center border-2 border-gray-200 rounded-2xl font-bold hover:bg-gray-50 transition-colors block">Bắt đầu ngay</router-link>
        </div>

        <!-- Personal Plan -->
        <div class="bg-white p-10 rounded-[2.5rem] border-2 border-[#FF6B2B] shadow-2xl flex flex-col relative reveal reveal-delay-2">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FF6B2B] text-white px-4 py-1 rounded-full text-sm font-bold">PHỔ BIẾN NHẤT</div>
          <h4 class="text-xl font-bold mb-2">Cá nhân</h4>
          <div class="flex items-baseline mb-6">
            <span class="text-4xl font-bold">₫199,000</span>
            <span class="text-gray-500 ml-1">/tháng</span>
          </div>
          <ul class="space-y-4 mb-8 flex-grow">
            <li class="flex items-center gap-2 text-gray-700 font-medium"><CheckCircleIcon class="w-5 h-5 text-[#FF6B2B] shrink-0" /> Quản lý 500 sản phẩm</li>
            <li class="flex items-center gap-2 text-gray-700 font-medium"><CheckCircleIcon class="w-5 h-5 text-[#FF6B2B] shrink-0" /> AI Chatbot cơ bản</li>
            <li class="flex items-center gap-2 text-gray-700 font-medium"><CheckCircleIcon class="w-5 h-5 text-[#FF6B2B] shrink-0" /> Phân tích doanh thu</li>
            <li class="flex items-center gap-2 text-gray-700 font-medium"><CheckCircleIcon class="w-5 h-5 text-[#FF6B2B] shrink-0" /> Email hỗ trợ 24/7</li>
          </ul>
          <router-link to="/register" class="w-full py-4 text-center bg-[#FF6B2B] text-white rounded-2xl font-bold hover:brightness-110 shadow-lg shadow-orange-300 transition-all block">Chọn gói này</router-link>
        </div>

        <!-- Pro Plan -->
        <div class="bg-gray-900 p-10 rounded-[2.5rem] text-white flex flex-col reveal reveal-delay-3">
          <h4 class="text-xl font-bold mb-2">Chuyên nghiệp</h4>
          <div class="flex items-baseline mb-6">
            <span class="text-4xl font-bold text-white">₫499,000</span>
            <span class="text-gray-400 ml-1">/tháng</span>
          </div>
          <ul class="space-y-4 mb-8 flex-grow">
            <li class="flex items-center gap-2 text-gray-300"><CheckCircleIcon class="w-5 h-5 text-[#FFD700] shrink-0" /> Không giới hạn sản phẩm</li>
            <li class="flex items-center gap-2 text-gray-300"><CheckCircleIcon class="w-5 h-5 text-[#FFD700] shrink-0" /> Gemini AI nâng cao</li>
            <li class="flex items-center gap-2 text-gray-300"><CheckCircleIcon class="w-5 h-5 text-[#FFD700] shrink-0" /> Custom domain riêng</li>
            <li class="flex items-center gap-2 text-gray-300"><CheckCircleIcon class="w-5 h-5 text-[#FFD700] shrink-0" /> Chuyên gia hỗ trợ riêng</li>
          </ul>
          <router-link to="/register" class="w-full py-4 text-center bg-white text-gray-900 rounded-2xl font-bold hover:bg-gray-100 transition-colors block">Liên hệ tư vấn</router-link>
        </div>
      </div>
    </section>

    <!-- Final CTA Area with Inline Form (matching Figma Image 2) -->
    <section class="relative overflow-hidden reveal">
      <!-- Full-width gradient background -->
      <div class="bg-gradient-to-r from-[#FF6B2B] to-[#FFD700] py-20 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-10">
            <h2 class="text-3xl md:text-4xl font-extrabold text-white mb-3">Sẵn sàng bắt đầu hành trình bán hàng?</h2>
            <p class="text-white/90 font-medium">
              Tạo cửa hàng của bạn ngay hôm nay - Miễn phí mãi mãi
            </p>
          </div>
          
          <!-- White card form matching Figma -->
          <div class="bg-white rounded-2xl p-8 md:p-10 shadow-2xl">
            <form class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="$router.push('/register')">
              <input type="text" placeholder="Tên cửa hàng" class="w-full h-13 px-4 rounded-xl bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B] focus:border-[#FF6B2B] text-gray-900 placeholder-gray-400 text-sm">
              <input type="text" placeholder="Tên chủ shop" class="w-full h-13 px-4 rounded-xl bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B] focus:border-[#FF6B2B] text-gray-900 placeholder-gray-400 text-sm">
              <input type="email" placeholder="Email" class="w-full h-13 px-4 rounded-xl bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B] focus:border-[#FF6B2B] text-gray-900 placeholder-gray-400 text-sm">
              <input type="tel" placeholder="Số điện thoại" class="w-full h-13 px-4 rounded-xl bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B] focus:border-[#FF6B2B] text-gray-900 placeholder-gray-400 text-sm">
              <input type="password" placeholder="Mật khẩu" class="w-full h-13 px-4 rounded-xl bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B] focus:border-[#FF6B2B] text-gray-900 placeholder-gray-400 text-sm">
              <select class="w-full h-13 px-4 rounded-xl bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B] focus:border-[#FF6B2B] text-gray-900 text-sm appearance-none cursor-pointer">
                <option value="RETAIL">Ngành hàng</option>
                <option value="RETAIL">Bán lẻ (Retail)</option>
                <option value="HOTEL">Khách sạn (Hotel)</option>
              </select>
              <button type="submit" class="sm:col-span-2 w-full h-13 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 active:scale-[0.98] transition-all flex justify-center items-center shadow-md text-sm">
                Tạo cửa hàng ngay — Miễn phí
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import { 
  LayoutDashboardIcon, 
  GlobeIcon, 
  BotIcon, 
  TrendingUpIcon, 
  ZapIcon, 
  CheckCircleIcon,
  UsersIcon,
  ShieldCheckIcon,
  StarIcon 
} from 'lucide-vue-next'

// Scroll reveal animation
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  )

  document.querySelectorAll('.reveal').forEach((el) => {
    observer.observe(el)
  })
})
</script>
