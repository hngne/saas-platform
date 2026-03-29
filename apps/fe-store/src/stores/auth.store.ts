import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export interface MerchantUser {
  id: string
  email: string
  name: string
  role?: string
}

export interface Tenant {
  id: string
  slug: string
  store_name: string
  business_type: string
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const user = ref<MerchantUser | null>(
    JSON.parse(localStorage.getItem('user') || 'null')
  )
  const tenant = ref<Tenant | null>(
    JSON.parse(localStorage.getItem('tenant') || 'null')
  )

  const isAuthenticated = computed(() => !!accessToken.value)

  async function login(email: string, password: string) {
    const { data } = await api.post('/merchant/auth/login-global', { email, password })
    const result = data.data

    accessToken.value = result.accessToken
    user.value = result.user
    tenant.value = result.tenant

    localStorage.setItem('accessToken', result.accessToken)
    localStorage.setItem('user', JSON.stringify(result.user))
    localStorage.setItem('tenant', JSON.stringify(result.tenant))
  }

  async function logout() {
    try {
      await api.post('/merchant/auth/logout')
    } catch {
      // ignore
    }
    clearAuth()
  }

  function clearAuth() {
    accessToken.value = null
    user.value = null
    tenant.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    localStorage.removeItem('tenant')
  }

  return {
    accessToken,
    user,
    tenant,
    isAuthenticated,
    login,
    logout,
    clearAuth,
  }
})
