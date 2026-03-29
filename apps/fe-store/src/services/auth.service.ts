import api from './api'

export const authService = {
  loginGlobal(email: string, password: string) {
    return api.post('/merchant/auth/login-global', { email, password })
  },

  logout() {
    return api.post('/merchant/auth/logout')
  },

  refresh() {
    return api.post('/merchant/auth/refresh')
  },
}
