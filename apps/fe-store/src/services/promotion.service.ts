import api from './api'

export interface PromotionDetail {
  product_id: string
  discount_percent: number
  product_name?: string
  product?: {
    id: string
    name: string
    base_price: number
    image_url?: string | null
  }
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

const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
}

const normalizeDetail = (detail: any): PromotionDetail => ({
  ...detail,
  discount_percent: Number(detail.discount_percent || 0),
  product_name: detail.product_name || detail.product?.name || '',
  product: detail.product
    ? {
        id: detail.product.id,
        name: detail.product.name,
        base_price: toNumber(detail.product.base_price),
        image_url:
          detail.product.images?.[0]?.image_url
          || detail.product.images?.[0]?.url
          || detail.product.image_url
          || null,
      }
    : undefined,
})

const normalizePromotion = (promotion: any): Promotion => ({
  ...promotion,
  details: (promotion.details || []).map(normalizeDetail),
})

const normalizePromotionListPayload = (payload: any) => {
  if (Array.isArray(payload?.data)) {
    payload.data = payload.data.map(normalizePromotion)
    return payload
  }

  if (Array.isArray(payload?.items)) {
    payload.items = payload.items.map(normalizePromotion)
    return payload
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizePromotion)
  }

  return payload
}

export const promotionService = {
  async getAll(params?: PromotionFilter) {
    const response = await api.get('/merchant/promotions', { params })
    response.data.data = normalizePromotionListPayload(response.data.data)
    return response
  },

  getByProduct(productId: string) {
    return api.get(`/merchant/promotions/product/${productId}`)
  },

  async getById(id: string) {
    const response = await api.get(`/merchant/promotions/${id}`)
    response.data.data = normalizePromotion(response.data.data)
    return response
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
