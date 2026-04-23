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

export interface VoucherSummary {
  total_vouchers: number
  active_vouchers: number
  expired_vouchers: number
  upcoming_vouchers: number
  inactive_vouchers: number
  fixed_vouchers: number
  percent_vouchers: number
  redeemed_vouchers: number
  total_redemptions: number
  discount_budget: number
  expiring_soon: number
  capacity_total: number
  capacity_used: number
  conversion_rate: number
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
  status?: 'ACTIVE' | 'EXPIRED' | 'UPCOMING' | 'INACTIVE'
  is_active?: string
  date_from?: string
  date_to?: string
  sort_order?: 'asc' | 'desc'
}

const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
}

const normalizeVoucher = (voucher: any): Voucher => ({
  ...voucher,
  discount_value: toNumber(voucher.discount_value),
  min_order_value: voucher.min_order_value == null ? null : toNumber(voucher.min_order_value),
  max_discount: voucher.max_discount == null ? null : toNumber(voucher.max_discount),
  usage_limit: voucher.usage_limit == null ? null : Number(voucher.usage_limit),
  used_count: Number(voucher.used_count || 0),
})

const normalizeListPayload = <T>(payload: any, normalizer: (item: any) => T) => {
  if (Array.isArray(payload?.data)) {
    payload.data = payload.data.map(normalizer)
    return payload
  }

  if (Array.isArray(payload?.items)) {
    payload.items = payload.items.map(normalizer)
    return payload
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizer)
  }

  return payload
}

const normalizeSummary = (payload: any): VoucherSummary => ({
  total_vouchers: Number(payload?.total_vouchers ?? 0),
  active_vouchers: Number(payload?.active_vouchers ?? 0),
  expired_vouchers: Number(payload?.expired_vouchers ?? 0),
  upcoming_vouchers: Number(payload?.upcoming_vouchers ?? 0),
  inactive_vouchers: Number(payload?.inactive_vouchers ?? 0),
  fixed_vouchers: Number(payload?.fixed_vouchers ?? 0),
  percent_vouchers: Number(payload?.percent_vouchers ?? 0),
  redeemed_vouchers: Number(payload?.redeemed_vouchers ?? 0),
  total_redemptions: Number(payload?.total_redemptions ?? 0),
  discount_budget: Number(payload?.discount_budget ?? 0),
  expiring_soon: Number(payload?.expiring_soon ?? 0),
  capacity_total: Number(payload?.capacity_total ?? 0),
  capacity_used: Number(payload?.capacity_used ?? 0),
  conversion_rate: Number(payload?.conversion_rate ?? 0),
})

export const voucherService = {
  async getAll(params?: VoucherFilter) {
    const response = await api.get('/merchant/vouchers', { params })
    response.data.data = normalizeListPayload(response.data.data, normalizeVoucher)
    return response
  },

  async getSummary() {
    const response = await api.get('/merchant/vouchers/summary')
    response.data.data = normalizeSummary(response.data.data)
    return response
  },

  async getById(id: string) {
    const response = await api.get(`/merchant/vouchers/${id}`)
    response.data.data = normalizeVoucher(response.data.data)
    return response
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
