import axios from 'axios'
import type { AxiosError } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  withCredentials: true,
})

// ─── Request Interceptor: attach Bearer token ──────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response Interceptor: auto refresh on 401 ─────────
let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  refreshQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token!)
  })
  refreshQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    if (error.response?.status === 401 && !originalRequest._retry) {
      // If the refresh request itself fails → logout
      if (originalRequest.url?.includes('/merchant/auth/refresh')) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        localStorage.removeItem('tenant')
        window.location.href = '/login'
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
        const { data } = await api.post('/merchant/auth/refresh')
        const newAccessToken = data.data.accessToken
        localStorage.setItem('accessToken', newAccessToken)

        processQueue(null, newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        localStorage.removeItem('tenant')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
