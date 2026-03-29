import api from './api'

export interface DashboardFilter {
  from?: string
  to?: string
  type?: 'day' | 'month' | 'year'
}

export interface TopFilter {
  top?: number
  from?: string
  to?: string
}

export const dashboardService = {
  getSummary() {
    return api.get('/merchant/dashboard/summary')
  },

  getRevenue(params?: DashboardFilter) {
    return api.get('/merchant/dashboard/revenue', { params })
  },

  getTopSelling(params?: TopFilter) {
    return api.get('/merchant/dashboard/top-selling', { params })
  },

  getTopNotSelling(params?: TopFilter) {
    return api.get('/merchant/dashboard/top-not-selling', { params })
  },

  exportExcel(params?: DashboardFilter) {
    return api.get('/merchant/dashboard/export-excel', {
      params,
      responseType: 'blob',
    })
  },

  exportPdf(params?: DashboardFilter) {
    return api.get('/merchant/dashboard/export-pdf', {
      params,
      responseType: 'blob',
    })
  },
}
