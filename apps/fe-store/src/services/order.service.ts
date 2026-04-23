import api from './api'

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'EXPIRED'
export type PaymentMethod = 'COD' | 'VNPAY'
export type ShippingMethodType = 'DELIVERY' | 'PICKUP'

export interface OrderItem {
  id: string
  product_id?: string
  variant_id?: string | null
  product_name: string
  sku_code?: string | null
  variant_info?: string
  quantity: number
  unit_price: number
  subtotal: number
  image_url?: string | null
}

export interface Order {
  id: string
  order_code: string
  customer_id?: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  shipping_address: string
  order_status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  subtotal: number
  shipping_fee: number
  discount_amount: number
  total_amount: number
  voucher_code?: string | null
  note?: string | null
  items: OrderItem[]
  item_count: number
  shipping_method_name?: string | null
  shipping_method_type?: ShippingMethodType | null
  shipping_method_fee?: number
  pickup_store_name?: string | null
  pickup_store_address?: string | null
  pickup_store_phone?: string | null
  payment_transaction_id?: string | null
  payment_paid_at?: string | null
  created_at: string
  updated_at: string
}

export interface OrderSummary {
  total_orders: number
  pending_orders: number
  processing_orders: number
  shipped_orders: number
  delivered_orders: number
  completed_orders: number
  cancelled_orders: number
  urgent_orders: number
  new_orders_today: number
  today_revenue: number
  cancellation_rate: number
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

type RawOrderItem = OrderItem & {
  variant?: {
    id?: string
    sku_code?: string | null
    product?: {
      id?: string
      name?: string
      images?: Array<{ image_url?: string | null; url?: string | null }>
    } | null
    variant_values?: Array<{
      attribute_value?: {
        value?: string | null
        attribute?: {
          name?: string | null
        } | null
      } | null
    }>
  } | null
}

type RawOrder = Partial<Order> & {
  id: string
  order_code?: string | null
  receiver_name?: string | null
  receiver_phone?: string | null
  total?: number | string | null
  discount?: number | string | null
  customer?: {
    id?: string
    name?: string | null
    email?: string | null
    phone?: string | null
  } | null
  voucher?: {
    code?: string | null
  } | null
  shipping_method?: {
    name?: string | null
    type?: ShippingMethodType | null
    fee?: number | string | null
  } | null
  pickup_store?: {
    name?: string | null
    address?: string | null
    phone?: string | null
  } | null
  payment?: {
    transaction_id?: string | null
    paid_at?: string | null
    method?: PaymentMethod
    status?: PaymentStatus
  } | null
  items?: RawOrderItem[]
}

const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
}

const buildOrderCode = (raw: RawOrder): string => {
  if (raw.order_code) return raw.order_code

  const compact = String(raw.id || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase()

  return `ORD-${compact || '000000'}`
}

const buildVariantInfo = (variantValues?: Array<any>): string => {
  return (variantValues || [])
    .map((item: any) => {
      const attribute = item?.attribute_value?.attribute?.name
      const value = item?.attribute_value?.value
      if (!attribute || !value) return ''
      return `${attribute}: ${value}`
    })
    .filter(Boolean)
    .join(' • ')
}

const getImageUrl = (images?: Array<{ image_url?: string | null; url?: string | null }>): string => {
  return images?.[0]?.image_url || images?.[0]?.url || ''
}

const normalizeItem = (item: RawOrderItem): OrderItem => {
  const unitPrice = toNumber(item.unit_price)
  const quantity = Number(item.quantity || 0)

  return {
    id: item.id,
    product_id: item.product_id || item.variant?.product?.id,
    variant_id: item.variant_id || item.variant?.id || null,
    product_name: item.product_name || item.variant?.product?.name || 'San pham',
    sku_code: item.sku_code || item.variant?.sku_code || null,
    variant_info: item.variant_info || buildVariantInfo(item.variant?.variant_values),
    quantity,
    unit_price: unitPrice,
    subtotal: toNumber(item.subtotal) || unitPrice * quantity,
    image_url: item.image_url || getImageUrl(item.variant?.product?.images) || '',
  }
}

const normalizeOrder = (raw: RawOrder): Order => {
  const items = (raw.items || []).map(normalizeItem)
  const itemCount = items.reduce((total, item) => total + item.quantity, 0)

  return {
    id: raw.id,
    order_code: buildOrderCode(raw),
    customer_id: raw.customer_id || raw.customer?.id,
    customer_name: raw.customer_name || raw.receiver_name || raw.customer?.name || 'Khach vang lai',
    customer_phone: raw.customer_phone || raw.receiver_phone || raw.customer?.phone || '',
    customer_email: raw.customer_email || raw.customer?.email || '',
    shipping_address: raw.shipping_address || '',
    order_status: (raw.order_status || 'PENDING') as OrderStatus,
    payment_status: (raw.payment_status || raw.payment?.status || 'PENDING') as PaymentStatus,
    payment_method: (raw.payment_method || raw.payment?.method || 'COD') as PaymentMethod,
    subtotal: toNumber(raw.subtotal),
    shipping_fee: toNumber(raw.shipping_fee),
    discount_amount: toNumber(raw.discount_amount ?? raw.discount),
    total_amount: toNumber(raw.total_amount ?? raw.total),
    voucher_code: raw.voucher_code || raw.voucher?.code || null,
    note: raw.note || null,
    items,
    item_count: itemCount,
    shipping_method_name: raw.shipping_method?.name || null,
    shipping_method_type: raw.shipping_method?.type || null,
    shipping_method_fee: toNumber(raw.shipping_method?.fee),
    pickup_store_name: raw.pickup_store?.name || null,
    pickup_store_address: raw.pickup_store?.address || null,
    pickup_store_phone: raw.pickup_store?.phone || null,
    payment_transaction_id: raw.payment?.transaction_id || null,
    payment_paid_at: raw.payment?.paid_at || null,
    created_at: raw.created_at || '',
    updated_at: raw.updated_at || '',
  }
}

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

const normalizeCountByStatus = (payload: any): Record<OrderStatus, number> => ({
  PENDING: Number(payload?.PENDING ?? payload?.pending ?? 0),
  PROCESSING: Number(payload?.PROCESSING ?? payload?.processing ?? 0),
  SHIPPED: Number(payload?.SHIPPED ?? payload?.shipped ?? 0),
  DELIVERED: Number(payload?.DELIVERED ?? payload?.delivered ?? 0),
  COMPLETED: Number(payload?.COMPLETED ?? payload?.completed ?? 0),
  CANCELLED: Number(payload?.CANCELLED ?? payload?.cancelled ?? 0),
})

const normalizeSummary = (payload: any): OrderSummary => ({
  total_orders: Number(payload?.total_orders ?? 0),
  pending_orders: Number(payload?.pending_orders ?? 0),
  processing_orders: Number(payload?.processing_orders ?? 0),
  shipped_orders: Number(payload?.shipped_orders ?? 0),
  delivered_orders: Number(payload?.delivered_orders ?? 0),
  completed_orders: Number(payload?.completed_orders ?? 0),
  cancelled_orders: Number(payload?.cancelled_orders ?? 0),
  urgent_orders: Number(payload?.urgent_orders ?? 0),
  new_orders_today: Number(payload?.new_orders_today ?? 0),
  today_revenue: Number(payload?.today_revenue ?? 0),
  cancellation_rate: Number(payload?.cancellation_rate ?? 0),
})

export const orderService = {
  async getAll(params?: OrderFilter) {
    const response = await api.get('/merchant/orders', { params })
    response.data.data = normalizeListPayload(response.data.data, normalizeOrder)
    return response
  },

  async countByStatus() {
    const response = await api.get('/merchant/orders/count-by-status')
    response.data.data = normalizeCountByStatus(response.data.data)
    return response
  },

  async getSummary() {
    const response = await api.get('/merchant/orders/summary')
    response.data.data = normalizeSummary(response.data.data)
    return response
  },

  async getById(id: string) {
    const response = await api.get(`/merchant/orders/${id}`)
    response.data.data = normalizeOrder(response.data.data)
    return response
  },

  updateStatus(id: string, dto: UpdateOrderStatusDto) {
    return api.patch(`/merchant/orders/${id}/status`, dto)
  },
}
