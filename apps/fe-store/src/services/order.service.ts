import api from './api'

export interface OrderItem {
  id: string
  product_id: string
  variant_id?: string | null
  product_name: string
  variant_info?: string
  quantity: number
  unit_price: number
  subtotal: number
  image_url?: string | null
}

export interface Order {
  id: string
  order_code: string
  customer_id: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  shipping_address: string
  order_status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  payment_method: 'COD' | 'VNPAY'
  subtotal: number
  shipping_fee: number
  discount_amount: number
  total_amount: number
  voucher_code?: string | null
  note?: string | null
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface OrderFilter {
  page?: number
  limit?: number
  order_status?: string
  payment_status?: string
  payment_method?: string
  date_from?: string
  date_to?: string
  search?: string
  sort_order?: 'asc' | 'desc'
}

export interface UpdateOrderStatusDto {
  order_status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  note?: string
}

export const orderService = {
  getAll(params?: OrderFilter) {
    return api.get('/merchant/orders', { params })
  },

  countByStatus() {
    return api.get('/merchant/orders/count-by-status')
  },

  getById(id: string) {
    return api.get(`/merchant/orders/${id}`)
  },

  updateStatus(id: string, dto: UpdateOrderStatusDto) {
    return api.patch(`/merchant/orders/${id}/status`, dto)
  },
}
