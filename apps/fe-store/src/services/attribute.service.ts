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

export const attributeService = {
  getAll() {
    return api.get('/merchant/attributes')
  },

  getById(id: string) {
    return api.get(`/merchant/attributes/${id}`)
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
