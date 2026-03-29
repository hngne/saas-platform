import api from './api'

export interface Voucher {
  id: string
  code: string
  name?: string | null
  discount_type: 'FIXED' | 'PERCENT'
  discount_value: number
  min_order_value?: number | null
  max_discount?: number | null
  usage_limit?: number | null
  used_count: number
  start_date?: string | null
  end_date?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateVoucherDto {
  code: string
  name?: string
  discount_type: 'FIXED' | 'PERCENT'
  discount_value: number
  min_order_value?: number | null
  max_discount?: number | null
  usage_limit?: number | null
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
}

export interface VoucherFilter {
  page?: number
  limit?: number
  search?: string
  discount_type?: 'FIXED' | 'PERCENT'
  is_active?: string
  date_from?: string
  date_to?: string
}

export const voucherService = {
  getAll(params?: VoucherFilter) {
    return api.get('/merchant/vouchers', { params })
  },

  getById(id: string) {
    return api.get(`/merchant/vouchers/${id}`)
  },

  create(dto: CreateVoucherDto) {
    return api.post('/merchant/vouchers', dto)
  },

  update(id: string, dto: Partial<CreateVoucherDto>) {
    return api.put(`/merchant/vouchers/${id}`, dto)
  },

  delete(id: string) {
    return api.delete(`/merchant/vouchers/${id}`)
  },

  toggleActive(id: string, is_active: boolean) {
    return api.patch(`/merchant/vouchers/${id}/toggle`, { is_active })
  },
}
