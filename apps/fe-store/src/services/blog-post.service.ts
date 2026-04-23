import api from './api'

export type BlogPostStatus = 'DRAFT' | 'PUBLISHED'

export interface BlogPostTag {
  id?: string
  tag: string
}

export interface BlogPost {
  id: string
  blog_category_id?: string | null
  title: string
  slug: string
  thumbnail_url?: string | null
  content: string
  status: BlogPostStatus
  published_at?: string | null
  deleted_at?: string | null
  view_count?: number
  created_at: string
  updated_at: string
  category?: {
    id: string
    name: string
    slug: string
  } | null
  tags: BlogPostTag[]
  _count?: {
    comments: number
  }
}

export interface BlogPostFilter {
  page?: number
  limit?: number
  search?: string
  blog_category_id?: string
  status?: BlogPostStatus
  tag?: string
}

export interface CreateBlogPostDto {
  blog_category_id?: string | null
  title: string
  thumbnail_url?: string | null
  content: string
  status?: BlogPostStatus
  tags?: string[]
}

const normalizePost = (post: any): BlogPost => ({
  ...post,
  view_count: Number(post.view_count || 0),
  tags: (post.tags || []).map((tag: any) => ({
    id: tag.id,
    tag: tag.tag,
  })),
  _count: {
    comments: Number(post?._count?.comments || 0),
  },
})

const normalizeListPayload = (payload: any) => {
  if (Array.isArray(payload?.data)) {
    payload.data = payload.data.map(normalizePost)
    return payload
  }

  if (Array.isArray(payload?.items)) {
    payload.items = payload.items.map(normalizePost)
    return payload
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizePost)
  }

  return payload
}

export const blogPostService = {
  async getAll(params?: BlogPostFilter) {
    const response = await api.get('/merchant/posts', { params })
    response.data.data = normalizeListPayload(response.data.data)
    return response
  },

  async getById(id: string) {
    const response = await api.get(`/merchant/posts/${id}`)
    response.data.data = normalizePost(response.data.data)
    return response
  },

  create(dto: CreateBlogPostDto) {
    return api.post('/merchant/posts', dto)
  },

  update(id: string, dto: Partial<CreateBlogPostDto>) {
    return api.put(`/merchant/posts/${id}`, dto)
  },

  delete(id: string) {
    return api.delete(`/merchant/posts/${id}`)
  },
}
