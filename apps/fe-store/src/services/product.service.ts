import api from './api'

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  sort_order: number
}

export interface ProductVariant {
  id: string
  product_id: string
  sku_code?: string | null
  price?: number | null
  stock: number
  image_url?: string | null
  is_active: boolean
  attribute_values?: Array<{
    id: string
    value: string
    color_hex?: string | null
    attribute?: { id: string; name: string }
  }>
  created_at: string
}

export interface Product {
  id: string
  name: string
  description?: string | null
  base_price: number
  category_id?: string | null
  has_variant: boolean
  material?: string | null
  is_active: boolean
  images: ProductImage[]
  variants: ProductVariant[]
  category?: { id: string; name: string } | null
  created_at: string
  updated_at: string
}

export interface ProductFilter {
  page?: number
  limit?: number
  search?: string
  category_id?: string
  is_active?: string
  has_variant?: string
  sort_by?: 'created_at' | 'name' | 'base_price'
  sort_order?: 'asc' | 'desc'
}

export const productService = {
  getAll(params?: ProductFilter) {
    return api.get('/merchant/products', { params })
  },

  getById(id: string) {
    return api.get(`/merchant/products/${id}`)
  },

  // multipart/form-data upload
  create(formData: FormData) {
    return api.post('/merchant/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  update(id: string, dto: { name?: string; description?: string | null; base_price?: number; category_id?: string | null; material?: string | null }) {
    return api.put(`/merchant/products/${id}`, dto)
  },

  delete(id: string) {
    return api.delete(`/merchant/products/${id}`)
  },

  toggleActive(id: string) {
    return api.patch(`/merchant/products/${id}/toggle`)
  },

  // Variants
  addVariant(productId: string, dto: { sku_code?: string; price?: number; stock?: number; image_url?: string; attribute_value_ids: string[] }) {
    return api.post(`/merchant/products/${productId}/variants`, dto)
  },

  updateVariant(productId: string, variantId: string, dto: { sku_code?: string; price?: number; stock?: number; image_url?: string }) {
    return api.put(`/merchant/products/${productId}/variants/${variantId}`, dto)
  },

  deleteVariant(productId: string, variantId: string) {
    return api.delete(`/merchant/products/${productId}/variants/${variantId}`)
  },

  toggleVariant(productId: string, variantId: string) {
    return api.patch(`/merchant/products/${productId}/variants/${variantId}/toggle`)
  },

  // Images
  deleteImage(productId: string, imageId: string) {
    return api.delete(`/merchant/products/${productId}/images/${imageId}`)
  },
}
