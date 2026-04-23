import api from './api'

export interface ChatMessage {
  id?: string
  _id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export interface ChatSession {
  _id?: string
  id?: string
  title?: string
  updated_at?: string
  created_at?: string
}

const unwrap = <T>(response: any): T => {
  const d = response?.data?.data ?? response?.data
  return d as T
}

export const chatService = {
  async send(message: string, sessionId?: string) {
    const response = await api.post('/chat/send', { message, session_id: sessionId })
    return unwrap<{ session_id: string; reply: string }>(response)
  },

  async getSessions() {
    const response = await api.get('/chat/sessions')
    return unwrap<ChatSession[]>(response)
  },

  async getHistory(sessionId: string) {
    const response = await api.get(`/chat/sessions/${sessionId}/messages`)
    return unwrap<ChatMessage[]>(response)
  },
}
