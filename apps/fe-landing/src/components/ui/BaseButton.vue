<template>
  <button
    :class="[
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B2B]',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variant === 'primary' 
        ? 'bg-gradient-to-r from-[#FF6B2B] to-[#FFD700] text-white hover:brightness-110 active:scale-95' 
        : '',
      variant === 'outline'
        ? 'border-2 border-[#FF6B2B] text-[#FF6B2B] hover:bg-[#FFF9F5] active:scale-95'
        : '',
      size === 'sm' ? 'px-4 py-2 text-sm' : '',
      size === 'md' ? 'px-6 py-3 text-base' : '',
      size === 'lg' ? 'px-8 py-4 text-lg' : '',
      fullWidth ? 'w-full' : ''
    ]"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  disabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  fullWidth: false,
  disabled: false,
  loading: false
})
</script>
