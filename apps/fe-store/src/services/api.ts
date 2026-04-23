import axios from 'axios'
import type { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

const isLocalNetworkHost = (hostname: string) =>
  hostname === 'localhost'
  || hostname === '127.0.0.1'
  || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
  || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)
  || /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)

const resolveBaseURL = () => {
  const rawBaseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL_T || 'http://localhost:8080/api'

  if (typeof window === 'undefined') return rawBaseURL

  try {
    const url = new URL(rawBaseURL, window.location.origin)
    const currentHostname = window.location.hostname
    const apiHostname = url.hostname
    const isTenantLocalhost = currentHostname.endsWith('.localhost')
    const isPlainLocalApi = apiHostname === 'localhost' || apiHostname === '127.0.0.1'
    const shouldReuseCurrentHostname = isLocalNetworkHost(currentHostname) && isLocalNetworkHost(apiHostname)

    if (isTenantLocalhost && isPlainLocalApi) {
      url.hostname = currentHostname
    }

    if (shouldReuseCurrentHostname) {
      url.hostname = currentHostname
    }

    return url.toString().replace(/\/$/, '')
  } catch {
    return rawBaseURL
  }
}

const baseURL = resolveBaseURL()

const api = axios.create({
  baseURL,
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
})

const readTenantSlug = () => {
  try {
    const authStore = useAuthStore()
    if (authStore.tenant?.slug) return authStore.tenant.slug

    const rawTenant = localStorage.getItem('tenant')
    if (!rawTenant) return null

    const tenant = JSON.parse(rawTenant) as { slug?: string } | null
    return tenant?.slug || null
  } catch {
    return null
  }
}

// ─── Request Interceptor: attach Bearer token ──────────
api.interceptors.request.use((config) => {
  if (config.url?.includes('/merchant/auth/refresh')) {
    if (config.headers?.Authorization) {
      delete config.headers.Authorization
    }
    return config
  }

  const authStore = useAuthStore()
  const token = authStore.accessToken || localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const tenantSlug = readTenantSlug()
  if (tenantSlug) {
    config.headers['x-tenant-slug'] = tenantSlug
  }
  return config
})

// ─── Response Interceptor: auto refresh on 401 ─────────
let isRefreshing = false
let refreshFailed = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

const redirectToLogin = () => {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

const processQueue = (error: unknown, token: string | null = null) => {
  refreshQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token!)
  })
  refreshQueue = []
}

api.interceptors.response.use(
  (response) => {
    if (
      response.config.url?.includes('/merchant/auth/login') ||
      response.config.url?.includes('/merchant/auth/refresh')
    ) {
      refreshFailed = false
    }

    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    if (error.response?.status === 401 && !originalRequest._retry) {
      const authStore = useAuthStore()
      // If the refresh request itself fails → logout
      if (originalRequest.url?.includes('/merchant/auth/refresh')) {
        refreshFailed = true
        authStore.clearAuth()
        return Promise.reject(error)
      }

      if (refreshFailed) {
        authStore.clearAuth()
        redirectToLogin()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await refreshClient.post('/merchant/auth/refresh')
        const newAccessToken = data.data.accessToken
        refreshFailed = false
        authStore.setAccessToken(newAccessToken)

        processQueue(null, newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        refreshFailed = true
        processQueue(refreshError)
        authStore.clearAuth()
        redirectToLogin()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
