import api from './api'

export type StaffRole = 'OWNER' | 'STAFF'
export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED'

export interface StaffMember {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: StaffRole
  status: StaffStatus
  created_at: string
  updated_at: string
}

export interface StaffSummary {
  total: number
  active: number
  blocked: number
  owners: number
}

export interface StaffFilter {
  page?: number
  limit?: number
  search?: string
  role?: StaffRole
  status?: StaffStatus
  sort_by?: 'created_at' | 'name' | 'email' | 'role' | 'status'
  sort_order?: 'asc' | 'desc'
}

export interface CreateStaffPayload {
  email: string
  password: string
  name: string
  phone?: string | null
  role: StaffRole
  status: StaffStatus
}

export type UpdateStaffPayload = Partial<Omit<CreateStaffPayload, 'password'>>

export const staffService = {
  getAll(params?: StaffFilter) {
    return api.get('/merchant/staff', { params })
  },

  getSummary() {
    return api.get('/merchant/staff/summary')
  },

  getById(id: string) {
    return api.get(`/merchant/staff/${id}`)
  },

  create(payload: CreateStaffPayload) {
    return api.post('/merchant/staff', payload)
  },

  update(id: string, payload: UpdateStaffPayload) {
    return api.put(`/merchant/staff/${id}`, payload)
  },

  updateStatus(id: string, status: StaffStatus) {
    return api.patch(`/merchant/staff/${id}/status`, { status })
  },

  delete(id: string) {
    return api.delete(`/merchant/staff/${id}`)
  },
}
