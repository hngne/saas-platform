import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { io, type Socket } from 'socket.io-client'
import api from '@/services/api'
import { useAuthStore } from './auth.store'

export interface NotificationItem {
  id: string
  title: string
  body: string
  type: 'ORDER' | 'INVENTORY' | 'SYSTEM' | 'PAYMENT'
  is_read: boolean
  created_at: string
}

export const useNotificationStore = defineStore('notification', () => {
  const items = ref<NotificationItem[]>([])
  const loading = ref(false)
  const socket = ref<Socket | null>(null)
  const connected = ref(false)
  const latestToast = ref<NotificationItem | null>(null)

  const unreadCount = computed(() => items.value.filter((n) => !n.is_read).length)

  function unwrapNotificationList(payload: any): NotificationItem[] | null {
    const candidates = [
      payload?.data?.data,
      payload?.data?.items,
      payload?.data,
      payload?.items,
      payload,
    ]

    const list = candidates.find((candidate) => Array.isArray(candidate))
    return Array.isArray(list) ? list : null
  }

  function mergeNotifications(remoteItems: NotificationItem[]) {
    const remoteIds = new Set(remoteItems.map((item) => item.id))

    // 1. Lọc theo ID (cơ bản)
    let transientItems = items.value.filter((item) => !remoteIds.has(item.id))

    // 2. Lọc theo nội dung (chống trùng lặp từ websocket chưa có ID thật)
    transientItems = transientItems.filter((transient) => {
      const isDuplicate = remoteItems.some(
        (remote) =>
          remote.title === transient.title &&
          remote.body === transient.body &&
          remote.type === transient.type &&
          // Chênh lệch thời gian không quá 2 phút
          Math.abs(
            new Date(remote.created_at).getTime() - new Date(transient.created_at).getTime(),
          ) < 120000,
      )
      return !isDuplicate
    })

    items.value = [...transientItems, ...remoteItems].sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    )
  }

  // ── REST API ──────────────────────────────────
  async function fetchNotifications(limit = 20) {
    loading.value = true
    try {
      const { data } = await api.get('/notifications', { params: { limit } })
      const list = unwrapNotificationList(data)
      if (list) mergeNotifications(list)
    } catch {
      // Giữ notification nhận từ websocket, không xoá panel khi API tạm lỗi.
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(id: string) {
    try {
      await api.put(`/notifications/${id}/read`)
      items.value = items.value.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    } catch {
      // ignore
    }
  }

  async function markAllAsRead() {
    try {
      await api.put('/notifications/read-all')
      items.value = items.value.map((n) => ({ ...n, is_read: true }))
    } catch {
      // ignore
    }
  }

  // ── Socket.IO ─────────────────────────────────
  function connectSocket() {
    const authStore = useAuthStore()
    const token = authStore.accessToken
    if (!token || socket.value?.connected) return

    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
    // Socket.IO server URL = baseURL without /api path
    const socketURL = baseURL.replace(/\/api\/?$/, '')

    const s = io(socketURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    })

    s.on('connect', () => {
      connected.value = true
      console.log('[Socket] Connected to server')
    })

    s.on('disconnect', () => {
      connected.value = false
      console.log('[Socket] Disconnected')
    })

    s.on('notification:new', (payload: Partial<NotificationItem>) => {
      const notification: NotificationItem = {
        id: payload.id || crypto.randomUUID(),
        title: payload.title || 'Thông báo mới',
        body: payload.body || '',
        type: payload.type || 'SYSTEM',
        is_read: false,
        created_at: payload.created_at || new Date().toISOString(),
      }

      // Prepend to list
      items.value = [notification, ...items.value]

      // Toast notification
      latestToast.value = notification

      // Play notification sound
      playNotificationSound()
    })

    socket.value = s
  }

  function disconnectSocket() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      connected.value = false
    }
  }

  function clearToast() {
    latestToast.value = null
  }

  function playNotificationSound() {
    try {
      const audioCtx = new AudioContext()
      const oscillator = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      oscillator.connect(gain)
      gain.connect(audioCtx.destination)
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime)
      oscillator.type = 'sine'
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4)
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.4)
    } catch {
      // AudioContext not supported
    }
  }

  return {
    items,
    loading,
    socket,
    connected,
    unreadCount,
    latestToast,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    connectSocket,
    disconnectSocket,
    clearToast,
  }
})
