import api from './api'

export interface BlogCategory {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  updated_at: string
  _count?: {
    posts: number
  }
}

export interface CreateBlogCategoryDto {
  name: string
  is_active?: boolean
}

const normalizeCategory = (category: any): BlogCategory => ({
  ...category,
  _count: {
    posts: Number(category?._count?.posts || 0),
  },
})

const normalizeListPayload = (payload: any) => {
  if (Array.isArray(payload?.data)) {
    payload.data = payload.data.map(normalizeCategory)
    return payload
  }

  if (Array.isArray(payload?.items)) {
    payload.items = payload.items.map(normalizeCategory)
    return payload
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizeCategory)
  }

  return payload
}

export const blogCategoryService = {
  async getAll() {
    const response = await api.get('/merchant/blog-categories')
    response.data.data = normalizeListPayload(response.data.data)
    return response
  },

  async getById(id: string) {
    const response = await api.get(`/merchant/blog-categories/${id}`)
    response.data.data = normalizeCategory(response.data.data)
    return response
  },

  create(dto: CreateBlogCategoryDto) {
    return api.post('/merchant/blog-categories', dto)
  },

  update(id: string, dto: Partial<CreateBlogCategoryDto>) {
    return api.put(`/merchant/blog-categories/${id}`, dto)
  },

  delete(id: string) {
    return api.delete(`/merchant/blog-categories/${id}`)
  },

  toggleActive(id: string, is_active: boolean) {
    return api.patch(`/merchant/blog-categories/${id}/toggle`, { is_active })
  },
}
