import api from './api'

export interface ShippingMethod {
  id: string
  name: string
  fee: number
  estimated_days?: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateShippingDto {
  name: string
  fee: number
  estimated_days?: number | null
  is_active?: boolean
}

export const shippingService = {
  getAll() {
    return api.get('/merchant/shipping')
  },

  getById(id: string) {
    return api.get(`/merchant/shipping/${id}`)
  },

  create(dto: CreateShippingDto) {
    return api.post('/merchant/shipping', dto)
  },

  update(id: string, dto: Partial<CreateShippingDto>) {
    return api.put(`/merchant/shipping/${id}`, dto)
  },

  delete(id: string) {
    return api.delete(`/merchant/shipping/${id}`)
  },

  toggleActive(id: string, is_active: boolean) {
    return api.patch(`/merchant/shipping/${id}/toggle`, { is_active })
  },
}
