import api from './api'

export interface AttributeValue {
  id: string
  attribute_id: string
  value: string
  color_hex?: string | null
  created_at: string
}

export interface Attribute {
  id: string
  name: string
  created_at: string
  values: AttributeValue[]
}

const normalizeAttribute = (attribute: any): Attribute => ({
  ...attribute,
  values: Array.isArray(attribute?.values) ? attribute.values : [],
})

const normalizeAttributeList = (payload: any): Attribute[] => {
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : []

  return rows.map(normalizeAttribute)
}

export const attributeService = {
  async getAll() {
    const response = await api.get('/merchant/attributes')
    response.data.data = normalizeAttributeList(response.data?.data)
    return response
  },

  async getById(id: string) {
    const response = await api.get(`/merchant/attributes/${id}`)
    response.data.data = normalizeAttribute(response.data?.data)
    return response
  },

  create(dto: { name: string; values: Array<{ value: string; color_hex?: string | null }> }) {
    return api.post('/merchant/attributes', dto)
  },

  update(id: string, dto: { name?: string }) {
    return api.put(`/merchant/attributes/${id}`, dto)
  },

  delete(id: string) {
    return api.delete(`/merchant/attributes/${id}`)
  },

  // Values
  createValue(attributeId: string, dto: { value: string; color_hex?: string | null }) {
    return api.post(`/merchant/attributes/${attributeId}/values`, dto)
  },

  updateValue(attributeId: string, valueId: string, dto: { value: string; color_hex?: string | null }) {
    return api.put(`/merchant/attributes/${attributeId}/values/${valueId}`, dto)
  },

  deleteValue(attributeId: string, valueId: string) {
    return api.delete(`/merchant/attributes/${attributeId}/values/${valueId}`)
  },
}
