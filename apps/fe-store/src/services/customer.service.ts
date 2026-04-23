import api from './api'

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED'

export interface Customer {
  id: string
  email: string
  name: string | null
  phone: string | null
  avatar_url: string | null
  status: CustomerStatus
  order_count: number
  review_count?: number
  total_spent: number
  created_at: string
  updated_at: string
}

export interface CustomerSummary {
  total: number
  active: number
  banned: number
  new_this_month: number
}

export interface CustomerFilter {
  page?: number
  limit?: number
  search?: string
  status?: CustomerStatus
  sort_by?: 'created_at' | 'name' | 'email' | 'status'
  sort_order?: 'asc' | 'desc'
}

export const customerService = {
  getAll(params?: CustomerFilter) {
    return api.get('/merchant/customers', { params })
  },

  getSummary() {
    return api.get('/merchant/customers/summary')
  },

  getById(id: string) {
    return api.get(`/merchant/customers/${id}`)
  },

  updateStatus(id: string, status: CustomerStatus) {
    return api.patch(`/merchant/customers/${id}/status`, { status })
  },
}
