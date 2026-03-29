import api from './api'

export interface Category {
  id: string
  name: string
  description?: string | null
  image_url?: string | null
  parent_id?: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  parent?: Category | null
  children?: Category[]
}

export interface CreateCategoryDto {
  name: string
  description?: string
  image_url?: string
  parent_id?: string | null
  sort_order?: number
  is_active?: boolean
}

export const categoryService = {
  getAll() {
    return api.get('/merchant/categories')
  },

  search(q: string) {
    return api.get('/merchant/categories/search', { params: { q } })
  },

  getById(id: string) {
    return api.get(`/merchant/categories/${id}`)
  },

  create(dto: CreateCategoryDto) {
    return api.post('/merchant/categories', dto)
  },

  update(id: string, dto: Partial<CreateCategoryDto>) {
    return api.put(`/merchant/categories/${id}`, dto)
  },

  delete(id: string) {
    return api.delete(`/merchant/categories/${id}`)
  },

  toggleActive(id: string, is_active: boolean) {
    return api.patch(`/merchant/categories/${id}/toggle`, { is_active })
  },
}
