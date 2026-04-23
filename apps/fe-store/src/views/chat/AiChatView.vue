<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { chatService, type ChatMessage, type ChatSession } from '@/services/chat.service'
import { useAppToast } from '@/composables/useToast'

const toast = useAppToast()

const sessions = ref<ChatSession[]>([])
const sessionId = ref<string>()
const messages = ref<ChatMessage[]>([])
const draft = ref('')
const sending = ref(false)
const booting = ref(true)
const chatThreadRef = ref<HTMLElement | null>(null)

const quickReplies = [
  { icon: 'pi-box', label: 'Gợi ý nhập hàng', message: 'Phân tích tồn kho và gợi ý những sản phẩm nào tôi cần nhập thêm hàng.' },
  { icon: 'pi-chart-line', label: 'Phân tích doanh thu', message: 'Phân tích doanh thu 7 ngày gần nhất cho tôi.' },
  { icon: 'pi-star', label: 'Sản phẩm bán chạy', message: 'Sản phẩm nào bán chạy nhất trong 30 ngày qua?' },
  { icon: 'pi-tag', label: 'Đề xuất khuyến mãi', message: 'Gợi ý chiến lược khuyến mãi và voucher phù hợp cho shop tôi.' },
  { icon: 'pi-exclamation-triangle', label: 'Tồn kho thấp', message: 'Liệt kê tất cả sản phẩm sắp hết hàng và cần nhập gấp.' },
]

const welcomeMessage = computed<ChatMessage>(() => ({
  id: 'welcome',
  role: 'assistant',
  content: 'Xin chào! Tôi là trợ lý AI quản lý kinh doanh của bạn. Tôi có thể giúp bạn:\n\n• Phân tích doanh thu & sản phẩm bán chạy\n• Gợi ý nhập hàng khi tồn kho thấp\n• Đề xuất chiến lược khuyến mãi & voucher\n• Tối ưu vận hành cửa hàng\n\nHãy hỏi tôi bất cứ điều gì!',
}))

const visibleMessages = computed(() => messages.value.length ? messages.value : [welcomeMessage.value])

const normalizeId = (s: ChatSession) => s._id || s.id || ''

const formatTime = (value?: string) => {
  if (!value) return 'Vừa xong'
  const d = new Date(value)
  if (isNaN(d.getTime())) return 'Vừa xong'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d)
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatThreadRef.value) {
    chatThreadRef.value.scrollTop = chatThreadRef.value.scrollHeight
  }
}

const startNewSession = () => {
  sessionId.value = undefined
  messages.value = []
  draft.value = ''
}

const loadSessions = async () => {
  booting.value = true
  try {
    const result = await chatService.getSessions()
    sessions.value = Array.isArray(result) ? result : []
    if (!sessionId.value && sessions.value[0]) {
      await loadMessages(normalizeId(sessions.value[0]))
    }
  } catch {
    sessions.value = []
  } finally {
    booting.value = false
  }
}

const loadMessages = async (id: string) => {
  sessionId.value = id
  try {
    const history = await chatService.getHistory(id)
    messages.value = Array.isArray(history) ? history : []
    scrollToBottom()
  } catch {
    messages.value = []
  }
}

const sendMessage = async (message = draft.value) => {
  const content = message.trim()
  if (!content || sending.value) return

  draft.value = ''
  const optimisticId = crypto.randomUUID()
  messages.value = [...visibleMessages.value, { id: optimisticId, role: 'user', content }]
  scrollToBottom()
  sending.value = true

  try {
    const result = await chatService.send(content, sessionId.value)
    sessionId.value = result.session_id || sessionId.value

    const latestHistory = sessionId.value
      ? await chatService.getHistory(sessionId.value).catch(() => null)
      : null

    if (Array.isArray(latestHistory) && latestHistory.length) {
      messages.value = latestHistory
    } else {
      messages.value = [
        ...messages.value.filter((m) => m.id !== optimisticId),
        { id: optimisticId, role: 'user', content },
        { id: crypto.randomUUID(), role: 'assistant', content: result.reply || 'Đã nhận yêu cầu.' },
      ]
    }

    scrollToBottom()
    await loadSessions()
  } catch (err: any) {
    messages.value = messages.value.filter((m) => m.id !== optimisticId)
    toast.error('Lỗi', err?.response?.data?.message || 'Không thể gửi tin nhắn.')
  } finally {
    sending.value = false
  }
}

watch(visibleMessages, scrollToBottom)
onMounted(loadSessions)
</script>

<template>
  <div class="ai-chat-page">
    <!-- Sidebar -->
    <aside class="chat-sidebar">
      <div class="sidebar-top">
        <h2>Trợ lý AI</h2>
        <button class="new-chat-btn" @click="startNewSession">
          <i class="pi pi-plus"></i> Chat mới
        </button>
      </div>

      <div class="session-list">
        <p v-if="!booting && !sessions.length" class="session-empty">Chưa có cuộc hội thoại nào.</p>
        <button
          v-for="s in sessions"
          :key="normalizeId(s)"
          class="session-card"
          :class="{ active: sessionId === normalizeId(s) }"
          @click="loadMessages(normalizeId(s))"
        >
          <i class="pi pi-comments"></i>
          <span>
            <strong>{{ s.title || 'Cuộc hội thoại mới' }}</strong>
            <small>{{ formatTime(s.updated_at || s.created_at) }}</small>
          </span>
        </button>
      </div>

      <div class="quick-section">
        <p class="quick-label">Gợi ý nhanh</p>
        <button v-for="q in quickReplies" :key="q.label" class="quick-btn" @click="sendMessage(q.message)">
          <i class="pi" :class="q.icon"></i> {{ q.label }}
        </button>
      </div>
    </aside>

    <!-- Chat main -->
    <main class="chat-main">
      <header class="chat-top">
        <div class="chat-top-avatar">
          <i class="pi pi-sparkles"></i>
          <span></span>
        </div>
        <div>
          <h3>Trợ lý quản lý kinh doanh</h3>
          <p>Phân tích dữ liệu thực của cửa hàng bạn</p>
        </div>
      </header>

      <section ref="chatThreadRef" class="chat-thread">
        <div class="thread-time">{{ sessionId ? 'Đang tiếp tục hội thoại' : 'Bắt đầu hội thoại mới' }}</div>

        <article
          v-for="msg in visibleMessages"
          :key="msg.id || msg._id"
          class="msg"
          :class="msg.role"
        >
          <i v-if="msg.role === 'assistant'" class="pi pi-sparkles msg-avatar"></i>
          <div class="msg-bubble" v-html="formatContent(msg.content)"></div>
        </article>

        <article v-if="sending" class="msg assistant">
          <i class="pi pi-sparkles msg-avatar"></i>
          <div class="msg-bubble typing">
            <span></span><span></span><span></span>
          </div>
        </article>
      </section>

      <footer class="chat-composer">
        <div class="quick-chips">
          <button v-for="q in quickReplies.slice(0, 3)" :key="q.label" @click="sendMessage(q.message)">
            <i class="pi" :class="q.icon"></i> {{ q.label }}
          </button>
        </div>
        <div class="composer-bar">
          <input
            v-model="draft"
            placeholder="Hỏi về tồn kho, doanh thu, khuyến mãi..."
            @keyup.enter="sendMessage()"
          />
          <button :disabled="sending" @click="sendMessage()">
            <i class="pi pi-send"></i>
          </button>
        </div>
      </footer>
    </main>
  </div>
</template>

<script lang="ts">
function formatContent(content: string): string {
  // Simple markdown-like formatting
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^• /gm, '&bull; ')
    .replace(/^- /gm, '&ndash; ')
    .replace(/\n/g, '<br>')
}
</script>

<style scoped>
.ai-chat-page {
  display: grid;
  grid-template-columns: 320px 1fr;
  height: calc(100vh - var(--header-height, 64px));
  margin: -24px;
  background: var(--bg-page);
}

/* ── Sidebar ────────────────────── */
.chat-sidebar {
  display: flex;
  flex-direction: column;
  background: #f4f7fb;
  border-right: 1px solid var(--border);
  overflow: hidden;
}

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.sidebar-top h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
}

.new-chat-btn {
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  color: #fff;
  font-weight: 700;
  font-size: 0.78rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.new-chat-btn:hover { opacity: 0.9; }

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.session-empty {
  color: var(--text-muted);
  text-align: center;
  padding: 20px;
  font-size: 0.85rem;
}

.session-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 6px;
  border: none;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}
.session-card:hover { background: #fff; }
.session-card.active { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.session-card i { color: var(--primary); font-size: 1rem; flex-shrink: 0; }
.session-card strong { display: block; font-size: 0.82rem; color: var(--text-primary); }
.session-card small { display: block; font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }

.quick-section {
  padding: 16px;
  border-top: 1px solid var(--border);
}
.quick-label {
  margin: 0 0 10px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.quick-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
.quick-btn:hover { color: var(--primary); }
.quick-btn i { color: var(--primary); }

/* ── Chat main ──────────────────── */
.chat-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #fff;
}

.chat-top {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
}

.chat-top-avatar {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.chat-top-avatar span {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid #fff;
}

.chat-top h3 { margin: 0; font-size: 0.95rem; font-weight: 700; }
.chat-top p { margin: 4px 0 0; font-size: 0.78rem; color: var(--text-muted); }

.chat-thread {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.thread-time {
  width: fit-content;
  margin: 0 auto 24px;
  padding: 6px 16px;
  border-radius: 999px;
  background: #f0f4f8;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.msg {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  animation: msgIn 0.25s ease both;
}

.msg.user { justify-content: flex-end; }

.msg-avatar {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
}

.msg-bubble {
  max-width: 720px;
  padding: 14px 18px;
  border-radius: 14px;
  line-height: 1.65;
  font-size: 0.88rem;
}

.msg.assistant .msg-bubble {
  background: #f4f7fb;
  color: var(--text-primary);
}

.msg.user .msg-bubble {
  background: linear-gradient(135deg, #FF6B2B, #e85d1f);
  color: #fff;
  border-radius: 14px 14px 4px 14px;
}

/* Typing indicator */
.typing {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 16px 20px;
}
.typing span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
  animation: typingDot 1.2s infinite;
}
.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }

/* ── Composer ───────────────────── */
.chat-composer {
  padding: 16px 24px 20px;
  border-top: 1px solid var(--border);
  background: #fff;
}

.quick-chips {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
}

.quick-chips button {
  flex: 0 0 auto;
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  color: var(--primary);
  font-size: 0.78rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.quick-chips button:hover {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.composer-bar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  height: 50px;
  padding: 0 6px 0 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #f8fafc;
  align-items: center;
}

.composer-bar input {
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.88rem;
}

.composer-bar button {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
}
.composer-bar button:disabled { opacity: 0.6; cursor: wait; }

/* ── Animations ─────────────────── */
@keyframes msgIn { from { opacity: 0; transform: translateY(8px); } }
@keyframes typingDot { 0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); } 30% { opacity: 1; transform: scale(1); } }

/* ── Responsive ─────────────────── */
@media (max-width: 900px) {
  .ai-chat-page { grid-template-columns: 1fr; }
  .chat-sidebar { display: none; }
}
</style>
