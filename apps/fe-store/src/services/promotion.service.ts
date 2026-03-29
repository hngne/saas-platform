import api from './api'

export interface PromotionDetail {
  product_id: string
  discount_percent: number
  product_name?: string
}

export interface Promotion {
  id: string
  name: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  is_active: boolean
  details: PromotionDetail[]
  created_at: string
  updated_at: string
}

export interface CreatePromotionDto {
  name: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
  details: Array<{ product_id: string; discount_percent: number }>
}

export interface UpdatePromotionDto {
  name?: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
}

export interface PromotionFilter {
  page?: number
  limit?: number
  search?: string
  is_active?: string
  date_from?: string
  date_to?: string
}

export const promotionService = {
  getAll(params?: PromotionFilter) {
    return api.get('/merchant/promotions', { params })
  },

  getByProduct(productId: string) {
    return api.get(`/merchant/promotions/product/${productId}`)
  },

  getById(id: string) {
    return api.get(`/merchant/promotions/${id}`)
  },

  create(dto: CreatePromotionDto) {
    return api.post('/merchant/promotions', dto)
  },

  update(id: string, dto: UpdatePromotionDto) {
    return api.put(`/merchant/promotions/${id}`, dto)
  },

  delete(id: string) {
    return api.delete(`/merchant/promotions/${id}`)
  },

  toggleActive(id: string, is_active: boolean) {
    return api.patch(`/merchant/promotions/${id}/toggle`, { is_active })
  },

  // Detail products
  addProduct(promotionId: string, dto: { product_id: string; discount_percent: number }) {
    return api.post(`/merchant/promotions/${promotionId}/products`, dto)
  },

  updateProduct(promotionId: string, productId: string, dto: { discount_percent: number }) {
    return api.put(`/merchant/promotions/${promotionId}/products/${productId}`, dto)
  },

  removeProduct(promotionId: string, productId: string) {
    return api.delete(`/merchant/promotions/${promotionId}/products/${productId}`)
  },
}
