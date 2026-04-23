import api from './api'

export interface InventoryAttributeValue {
  id?: string
  value?: string
  attribute?: {
    id?: string
    name?: string
  } | null
}

export interface InventoryVariantValue {
  id?: string
  attribute_value?: InventoryAttributeValue | null
}

export interface InventoryProductImage {
  id?: string
  image_url?: string | null
  url?: string | null
}

export interface InventoryProduct {
  id?: string
  name?: string
  category?: {
    id?: string
    name?: string
  } | null
  images?: InventoryProductImage[]
}

export interface InventoryItem {
  id?: string
  variant_id?: string
  product_id?: string
  product_name?: string
  sku_code?: string | null
  stock: number
  low_stock_threshold?: number
  category_name?: string | null
  variant_info?: string
  image_url?: string | null
  product?: InventoryProduct | null
  variant_values?: InventoryVariantValue[]
  recent_logs?: InventoryLog[]
}

export interface InventoryLog {
  id: string
  variant_id: string
  type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN'
  quantity: number
  before_stock?: number
  after_stock?: number
  note?: string | null
  created_by?: string
  created_at: string
  product_name?: string
  sku_code?: string
  variant?: {
    sku_code?: string | null
    product?: InventoryProduct | null
    variant_values?: InventoryVariantValue[]
  } | null
}

type RawInventoryProductImage = InventoryProductImage & { url?: string | null }
type RawInventoryProduct = InventoryProduct & {
  images?: RawInventoryProductImage[]
}
type RawInventoryLog = InventoryLog & {
  variant?: {
    sku_code?: string | null
    product?: RawInventoryProduct | null
    variant_values?: InventoryVariantValue[]
  } | null
}
type RawInventoryItem = InventoryItem & {
  product?: RawInventoryProduct | null
  recent_logs?: RawInventoryLog[]
}

const normalizeImage = (image: RawInventoryProductImage): InventoryProductImage => ({
  ...image,
  image_url: image.image_url || image.url || '',
})

const normalizeProduct = (product?: RawInventoryProduct | null): InventoryProduct | null | undefined => {
  if (!product) return product

  return {
    ...product,
    images: (product.images || []).map(normalizeImage),
  }
}

const normalizeLog = (log: RawInventoryLog): InventoryLog => ({
  ...log,
  variant: log.variant
    ? {
        ...log.variant,
        product: normalizeProduct(log.variant.product),
      }
    : log.variant,
})

const normalizeItem = (item: RawInventoryItem): InventoryItem => ({
  ...item,
  image_url: item.image_url || item.product?.images?.[0]?.image_url || item.product?.images?.[0]?.url || '',
  product: normalizeProduct(item.product),
  recent_logs: (item.recent_logs || []).map(normalizeLog),
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

export interface InventoryFilter {
  page?: number
  limit?: number
  search?: string
  category_id?: string
  low_stock?: string
  sort_order?: 'asc' | 'desc'
}

export interface LogFilter {
  page?: number
  limit?: number
  variant_id?: string
  type?: 'IN' | 'OUT' | 'ADJUST' | 'RETURN'
  date_from?: string
  date_to?: string
}

export interface AdjustInventoryDto {
  variant_id: string
  type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN'
  quantity: number
  note?: string
}

export const inventoryService = {
  async getAll(params?: InventoryFilter) {
    const response = await api.get('/merchant/inventory', { params })
    response.data.data = normalizeListPayload(response.data.data, normalizeItem)
    return response
  },

  async getByVariantId(variantId: string) {
    const response = await api.get(`/merchant/inventory/${variantId}`)
    response.data.data = normalizeItem(response.data.data)
    return response
  },

  async getLogs(params?: LogFilter) {
    const response = await api.get('/merchant/inventory/logs', { params })
    response.data.data = normalizeListPayload(response.data.data, normalizeLog)
    return response
  },

  async getLowStock() {
    const response = await api.get('/merchant/inventory/low-stock')
    response.data.data = normalizeListPayload(response.data.data, normalizeItem)
    return response
  },

  adjust(dto: AdjustInventoryDto) {
    return api.post('/merchant/inventory/adjust', dto)
  },

  exportPdf(params?: InventoryFilter) {
    return api.get('/merchant/inventory/export-pdf', {
      params,
      responseType: 'blob',
    })
  },
}
