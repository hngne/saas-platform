import api from './api'

export interface Store {
  id: string
  name: string
  address: string
  province?: string | null
  district?: string | null
  ward?: string | null
  phone?: string | null
  latitude?: number | null
  longitude?: number | null
  open_time?: string | null
  close_time?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StoreFilter {
  page?: number
  limit?: number
  search?: string
  province?: string
  is_active?: string
}

export interface CreateStoreDto {
  name: string
  address: string
  province?: string | null
  district?: string | null
  ward?: string | null
  phone?: string | null
  latitude?: number | null
  longitude?: number | null
  open_time?: string | null
  close_time?: string | null
  is_active?: boolean
}

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return null
}

const normalizeStore = (store: any): Store => ({
  ...store,
  latitude: store.latitude == null ? null : toNumber(store.latitude),
  longitude: store.longitude == null ? null : toNumber(store.longitude),
})

const normalizeListPayload = (payload: any) => {
  if (Array.isArray(payload?.data)) {
    payload.data = payload.data.map(normalizeStore)
    return payload
  }

  if (Array.isArray(payload?.items)) {
    payload.items = payload.items.map(normalizeStore)
    return payload
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizeStore)
  }

  return payload
}

export const storeService = {
  async getAll(params?: StoreFilter) {
    const response = await api.get('/merchant/stores', { params })
    response.data.data = normalizeListPayload(response.data.data)
    return response
  },

  async getById(id: string) {
    const response = await api.get(`/merchant/stores/${id}`)
    response.data.data = normalizeStore(response.data.data)
    return response
  },

  create(dto: CreateStoreDto) {
    return api.post('/merchant/stores', dto)
  },

  update(id: string, dto: Partial<CreateStoreDto>) {
    return api.put(`/merchant/stores/${id}`, dto)
  },

  delete(id: string) {
    return api.delete(`/merchant/stores/${id}`)
  },

  toggleActive(id: string, is_active: boolean) {
    return api.patch(`/merchant/stores/${id}/toggle`, { is_active })
  },
}
