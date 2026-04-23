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
  slug?: string | null
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

type RawProductImage = ProductImage & { url?: string | null }
type RawVariantAttributeValue = {
  id?: string
  attribute_value?: {
    id: string
    value: string
    color_hex?: string | null
    attribute?: { id: string; name: string }
  }
}
type RawProductVariant = ProductVariant & {
  variant_values?: RawVariantAttributeValue[]
}
type RawProduct = Product & {
  images?: RawProductImage[]
  variants?: RawProductVariant[]
}

const normalizeImage = (image: RawProductImage): ProductImage => ({
  ...image,
  image_url: image.image_url || image.url || '',
})

const normalizeVariant = (variant: RawProductVariant): ProductVariant => ({
  ...variant,
  attribute_values: variant.attribute_values
    || variant.variant_values?.map((item) => ({
      id: item.attribute_value?.id || item.id || '',
      value: item.attribute_value?.value || '',
      color_hex: item.attribute_value?.color_hex || null,
      attribute: item.attribute_value?.attribute,
    }))
    || [],
})

const normalizeProduct = (product: RawProduct): Product => ({
  ...product,
  images: (product.images || []).map(normalizeImage),
  variants: (product.variants || []).map(normalizeVariant),
})

const normalizeProductListResponse = (payload: any) => {
  if (Array.isArray(payload?.data)) {
    payload.data = payload.data.map(normalizeProduct)
    return payload
  }

  if (Array.isArray(payload?.items)) {
    payload.items = payload.items.map(normalizeProduct)
    return payload
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizeProduct)
  }

  return payload
}

export const productService = {
  async getAll(params?: ProductFilter) {
    const response = await api.get('/merchant/products', { params })
    response.data.data = normalizeProductListResponse(response.data.data)
    return response
  },

  async getById(id: string) {
    const response = await api.get(`/merchant/products/${id}`)
    response.data.data = normalizeProduct(response.data.data)
    return response
  },

  // multipart/form-data upload
  create(formData: FormData) {
    return api.post('/merchant/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  update(id: string, dto: { name?: string; description?: string | null; base_price?: number; category_id?: string | null; material?: string | null } | FormData) {
    if (dto instanceof FormData) {
      return api.put(`/merchant/products/${id}`, dto, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }

    return api.put(`/merchant/products/${id}`, dto)
  },

  delete(id: string) {
    return api.delete(`/merchant/products/${id}`)
  },

  toggleActive(id: string, is_active: boolean) {
    return api.patch(`/merchant/products/${id}/toggle`, { is_active })
  },

  // Variants
  addVariant(productId: string, dto: { sku_code?: string | null; price?: number | null; stock?: number; image_url?: string | null; attribute_value_ids: string[] }) {
    return api.post(`/merchant/products/${productId}/variants`, dto)
  },

  updateVariant(productId: string, variantId: string, dto: { sku_code?: string | null; price?: number | null; stock?: number; image_url?: string | null; attribute_value_ids?: string[] }) {
    return api.put(`/merchant/products/${productId}/variants/${variantId}`, dto)
  },

  uploadVariantImage(file: File) {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/upload/product', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteVariant(productId: string, variantId: string) {
    return api.delete(`/merchant/products/${productId}/variants/${variantId}`)
  },

  toggleVariant(productId: string, variantId: string, is_active: boolean) {
    return api.patch(`/merchant/products/${productId}/variants/${variantId}/toggle`, { is_active })
  },

  // Images
  deleteImage(productId: string, imageId: string) {
    return api.delete(`/merchant/products/${productId}/images/${imageId}`)
  },
}
