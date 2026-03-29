import api from './api'

export interface InventoryItem {
  variant_id: string
  product_id: string
  product_name: string
  sku_code?: string | null
  stock: number
  low_stock_threshold?: number
  category_name?: string | null
  variant_info?: string
  image_url?: string | null
}

export interface InventoryLog {
  id: string
  variant_id: string
  type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN'
  quantity: number
  note?: string | null
  created_by?: string
  created_at: string
  product_name?: string
  sku_code?: string
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
  type: 'IN' | 'OUT' | 'ADJUST'
  quantity: number
  note?: string
}

export const inventoryService = {
  getAll(params?: InventoryFilter) {
    return api.get('/merchant/inventory', { params })
  },

  getByVariantId(variantId: string) {
    return api.get(`/merchant/inventory/${variantId}`)
  },

  getLogs(params?: LogFilter) {
    return api.get('/merchant/inventory/logs', { params })
  },

  getLowStock() {
    return api.get('/merchant/inventory/low-stock')
  },

  adjust(dto: AdjustInventoryDto) {
    return api.post('/merchant/inventory/adjust', dto)
  },
}
