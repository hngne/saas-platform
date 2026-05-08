import api from './api'

export interface ShopSettings {
  slug: string
  business_type: string
  store_name: string
  store_description: string
  owner_name: string
  phone: string
  email: string
  address: string
  tax_code: string
  logo_url: string
  favicon_url: string
  primary_color: string
  secondary_color: string
  banner_url: string
  homepage_sections: string
}

export const settingsService = {
  async get(): Promise<ShopSettings> {
    const { data } = await api.get('/merchant/settings')
    return data.data as ShopSettings
  },

  async update(dto: Partial<ShopSettings>): Promise<ShopSettings> {
    const { data } = await api.put('/merchant/settings', dto)
    return data.data as ShopSettings
  },
}
