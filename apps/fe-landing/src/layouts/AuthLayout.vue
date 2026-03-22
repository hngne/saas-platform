<template>
  <div class="h-screen bg-white flex relative overflow-hidden">
    <!-- Left panel (Brand) -->
    <div class="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-[#FF6B2B] to-[#FFD700] text-white overflow-hidden">
      <!-- Decorative background elements -->
      <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      
      <div class="relative z-10 w-full p-12 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 mb-16">
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span class="text-[#FF6B2B] font-bold text-xl">S</span>
            </div>
            <span class="font-bold text-2xl tracking-tight">Shopflow</span>
          </div>
          
          <h1 class="text-4xl md:text-5xl font-bold leading-tight mb-6">
            {{ title }}
          </h1>
          <p class="text-xl text-white/90 max-w-md">
            {{ subtitle }}
          </p>
        </div>
        
        <div class="space-y-6">
          <div class="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
            <div class="bg-white/20 p-3 rounded-full">
              <slot name="feature-icon-1"></slot>
            </div>
            <div>
              <p class="font-semibold text-lg">{{ feature1Title }}</p>
              <p class="text-white/80 text-sm">{{ feature1Desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right panel (Form) -->
    <div class="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-16 xl:px-20 overflow-y-auto">
      <div class="mx-auto w-full max-w-lg py-6">
        <!-- Mobile Logo - left aligned to match both login & register -->
        <div class="flex items-center gap-2 mb-6 lg:hidden">
          <div class="w-10 h-10 bg-gradient-to-br from-[#FF6B2B] to-[#FFD700] rounded-xl flex items-center justify-center">
            <span class="text-white font-bold text-xl">S</span>
          </div>
          <span class="font-bold text-2xl text-gray-900 tracking-tight">Shopflow</span>
        </div>

        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
  feature1Title: string
  feature1Desc: string
}>()
</script>
