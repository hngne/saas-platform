import api from './api'

export interface Category {
  id: string
  name: string
  slug?: string
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
  slug?: string
  description?: string
  image_url?: string
  parent_id?: string | null
  sort_order?: number
  is_active?: boolean
}

const sortByOrder = (categories: Category[]) =>
  [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

const flattenCategories = (categories: Category[]) => {
  const result: Category[] = []
  const seen = new Set<string>()

  const walk = (items: Category[]) => {
    sortByOrder(items).forEach((item) => {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        result.push(item)
      }

      if (item.children?.length) {
        walk(item.children)
      }
    })
  }

  walk(categories)
  return result
}

const normalizeCategoryListResponse = <T extends { data?: { data?: Category[] } }>(
  response: T,
) => {
  response.data = response.data || {}
  response.data.data = flattenCategories(response.data.data || [])
  return response
}

export const categoryService = {
  getAll() {
    return api.get('/merchant/categories').then(normalizeCategoryListResponse)
  },

  search(q: string) {
    return api
      .get('/merchant/categories/search', { params: { q } })
      .then(normalizeCategoryListResponse)
  },

  getById(id: string) {
    return api.get(`/merchant/categories/${id}`)
  },

  create(dto: CreateCategoryDto | FormData) {
    if (dto instanceof FormData) {
      return api.post('/merchant/categories', dto, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return api.post('/merchant/categories', dto)
  },

  update(id: string, dto: Partial<CreateCategoryDto> | FormData) {
    if (dto instanceof FormData) {
      return api.put(`/merchant/categories/${id}`, dto, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return api.put(`/merchant/categories/${id}`, dto)
  },

  delete(id: string) {
    return api.delete(`/merchant/categories/${id}`)
  },

  toggleActive(id: string, is_active: boolean) {
    return api.patch(`/merchant/categories/${id}/toggle`, { is_active })
  },
}
