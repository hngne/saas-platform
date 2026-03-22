<template>
  <div class="w-full">
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
    </label>
    <div class="relative">
      <div v-if="$slots.icon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
        <slot name="icon"></slot>
      </div>
      <input
        :type="inputType"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :class="[
          'block w-full rounded-xl sm:text-sm transition-all duration-200',
          $slots.icon ? 'pl-10' : 'pl-4',
          type === 'password' ? 'pr-10' : 'pr-4',
          'py-3 bg-white border outline-none',
          error 
            ? 'border-red-500 text-red-900 placeholder-red-300 focus:ring-1 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 focus:ring-1 focus:ring-[#FF6B2B] focus:border-[#FF6B2B]'
        ]"
        v-bind="$attrs"
      />
      <button 
        v-if="type === 'password'" 
        type="button"
        @click="togglePassword"
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <component :is="showPassword ? EyeOffIcon : EyeIcon" class="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <p v-if="error" class="mt-2 text-sm text-red-600" id="email-error">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { EyeIcon, EyeOffIcon } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  label?: string
  type?: string
  error?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type || 'text'
})

const togglePassword = () => {
  showPassword.value = !showPassword.value
}
</script>
