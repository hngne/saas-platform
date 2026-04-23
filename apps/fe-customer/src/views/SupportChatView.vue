<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ArrowLeft, Bot, Headphones, Home, MoreVertical, Paperclip, Plus, Send, Truck, WalletCards, RefreshCw } from "lucide-vue-next";
import { chatApi, getApiErrorMessage, type ChatMessage } from "@/api/customer";
import { getStoreDisplayName } from "@/utils/storefront-brand";

interface ChatSessionItem {
  _id?: string;
  id?: string;
  title?: string;
  updated_at?: string;
  created_at?: string;
}

const displayStoreName = computed(getStoreDisplayName);
const sessionId = ref<string>();
const sessions = ref<ChatSessionItem[]>([]);
const draft = ref("");
const sending = ref(false);
const booting = ref(true);
const errorMessage = ref("");
const messages = ref<ChatMessage[]>([]);

const quickReplies = [
  { icon: Truck, label: "Kiểm tra đơn hàng", message: "Kiểm tra đơn hàng gần nhất của tôi." },
  { icon: RefreshCw, label: "Chính sách đổi trả", message: "Chính sách đổi trả của cửa hàng như thế nào?" },
  { icon: WalletCards, label: "Phí vận chuyển", message: "Phí vận chuyển hiện tại là bao nhiêu?" },
  { icon: Headphones, label: "Tư vấn sản phẩm", message: "Tư vấn giúp tôi sản phẩm phù hợp với phòng khách hiện đại." },
];

const welcomeMessage = computed<ChatMessage>(() => ({
  id: "welcome",
  role: "assistant",
  content: `Xin chào, mình là trợ lý AI của ${displayStoreName.value}. Bạn có thể hỏi về sản phẩm, giao hàng, thanh toán, đơn hàng và chính sách của shop.`,
}));

const visibleMessages = computed(() => (messages.value.length ? messages.value : [welcomeMessage.value]));

const formatSessionTime = (value?: string) => {
  if (!value) return "Vừa xong";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa xong";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const normalizeSessionId = (session: ChatSessionItem) => session._id || session.id || "";

const startNewSession = () => {
  sessionId.value = undefined;
  messages.value = [];
  draft.value = "";
  errorMessage.value = "";
};

const loadMessages = async (id: string) => {
  sessionId.value = id;
  errorMessage.value = "";
  try {
    const history = await chatApi.getHistory(id);
    messages.value = Array.isArray(history) ? history : [];
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Không tải được lịch sử trò chuyện.");
    messages.value = [];
  }
};

const loadSessions = async () => {
  booting.value = true;
  errorMessage.value = "";
  try {
    const result = await chatApi.getSessions();
    sessions.value = Array.isArray(result) ? result : [];
    if (sessionId.value) return;
    const latest = sessions.value[0];
    if (latest) {
      await loadMessages(normalizeSessionId(latest));
    } else {
      messages.value = [];
    }
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Không thể khởi tạo trợ lý AI.");
    sessions.value = [];
    messages.value = [];
  } finally {
    booting.value = false;
  }
};

const sendMessage = async (message = draft.value) => {
  const content = message.trim();
  if (!content || sending.value) return;

  errorMessage.value = "";
  draft.value = "";
  const optimisticId = crypto.randomUUID();
  messages.value = [...visibleMessages.value, { id: optimisticId, role: "user", content }];
  sending.value = true;

  try {
    const result = await chatApi.send(content, sessionId.value);
    sessionId.value = result.session_id || sessionId.value;

    const latestHistory = sessionId.value ? await chatApi.getHistory(sessionId.value).catch(() => null) : null;
    if (Array.isArray(latestHistory) && latestHistory.length) {
      messages.value = latestHistory;
    } else {
      messages.value = [
        ...messages.value.filter((item) => item.id !== optimisticId),
        { id: optimisticId, role: "user", content },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.reply || "Mình đã nhận được yêu cầu của bạn.",
        },
      ];
    }

    await loadSessions();
  } catch (error) {
    messages.value = messages.value.filter((item) => item.id !== optimisticId);
    errorMessage.value = getApiErrorMessage(error, "Chưa thể gửi tin nhắn tới trợ lý AI.");
  } finally {
    sending.value = false;
  }
};

onMounted(loadSessions);
</script>

<template>
  <section class="support-page theme-editorial">
    <aside class="support-sidebar">
      <div class="sidebar-head">
        <h1>Trợ lý trực tuyến</h1>
        <button type="button" class="new-session" @click="startNewSession">
          <Plus :size="16" />
          Chat mới
        </button>
      </div>

      <section>
        <h2>Lịch sử hỗ trợ</h2>
        <button
          v-for="session in sessions"
          :key="normalizeSessionId(session)"
          type="button"
          class="history-card"
          :class="{ active: sessionId === normalizeSessionId(session) }"
          @click="loadMessages(normalizeSessionId(session))"
        >
          <Bot :size="22" />
          <span>
            <strong>{{ session.title || "Cuộc hội thoại mới" }}</strong>
            <small>{{ formatSessionTime(session.updated_at || session.created_at) }}</small>
          </span>
        </button>
        <p v-if="!booting && !sessions.length" class="sidebar-empty">Chưa có cuộc hội thoại nào. Hãy bắt đầu bằng một câu hỏi mới.</p>
      </section>

      <section class="topic-list">
        <h2>Chủ đề thường gặp</h2>
        <button v-for="topic in quickReplies" :key="topic.label" type="button" @click="sendMessage(topic.message)">
          <component :is="topic.icon" :size="22" />
          {{ topic.label }}
        </button>
      </section>
    </aside>

    <main class="chat-main">
      <header class="chat-header">
        <div class="chat-nav">
          <RouterLink to="/" class="nav-button" aria-label="Về trang chủ shop">
            <Home :size="18" />
          </RouterLink>
          <RouterLink to="/account" class="nav-button desktop-back" aria-label="Về khu vực tài khoản">
            <ArrowLeft :size="18" />
          </RouterLink>
        </div>
        <div class="bot-avatar">
          <Bot :size="30" />
          <span></span>
        </div>
        <div>
          <h2>Trợ lý AI {{ displayStoreName }}</h2>
          <p>Đang sử dụng dữ liệu thực của shop hiện tại</p>
        </div>
        <div class="chat-actions">
          <Headphones :size="24" />
          <MoreVertical :size="24" />
        </div>
      </header>

      <section class="chat-thread">
        <time>{{ sessionId ? "Đang tiếp tục cuộc hội thoại" : "Bắt đầu cuộc hội thoại mới" }}</time>

        <article
          v-for="message in visibleMessages"
          :key="message.id"
          class="message"
          :class="message.role === 'user' ? 'user' : 'bot'"
        >
          <Bot v-if="message.role === 'assistant'" :size="18" />
          <p>{{ message.content }}</p>
        </article>

        <p v-if="booting" class="chat-note">Đang tải lịch sử trò chuyện...</p>
        <p v-if="errorMessage" class="chat-error">{{ errorMessage }}</p>
      </section>

      <footer class="chat-composer">
        <div class="quick-replies">
          <button v-for="topic in quickReplies" :key="topic.label" type="button" @click="sendMessage(topic.message)">
            {{ topic.label }}
          </button>
        </div>
        <label>
          <Paperclip :size="24" />
          <input v-model="draft" placeholder="Nhập tin nhắn..." @keyup.enter="sendMessage()" />
          <button type="button" :disabled="sending" aria-label="Gửi tin nhắn" @click="sendMessage()"><Send :size="24" /></button>
        </label>
        <p>Trợ lý AI chỉ trả lời theo dữ liệu hiện có của cửa hàng. Nếu cần xác nhận cuối cùng, vui lòng liên hệ nhân viên.</p>
      </footer>
    </main>
  </section>
</template>

<style scoped>
.support-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 360px 1fr;
  background: var(--sf-bg);
  color: var(--sf-ink);
}

.support-sidebar {
  display: grid;
  align-content: start;
  gap: 40px;
  padding: 28px;
  background: #eaf1fb;
}

.sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.new-session {
  height: 38px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: var(--sf-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
}

.support-sidebar h1,
.support-sidebar h2,
.chat-header h2 {
  margin: 0;
}

.support-sidebar h1 {
  font-size: 28px;
  letter-spacing: -0.04em;
}

.support-sidebar h2 {
  margin-bottom: 18px;
  font-size: 22px;
}

.history-card,
.topic-list button {
  width: 100%;
  border: none;
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: left;
  color: #4b5563;
}

.history-card {
  min-height: 76px;
  margin-bottom: 12px;
  padding: 0 12px;
  border-radius: 8px;
  background: transparent;
}

.history-card.active,
.history-card:hover {
  background: #fff;
}

.history-card strong,
.history-card small {
  display: block;
}

.history-card strong {
  color: var(--sf-ink);
  font-size: 16px;
}

.sidebar-empty {
  margin: 12px 0 0;
  color: var(--sf-muted);
  line-height: 1.6;
}

.topic-list {
  margin-top: auto;
}

.topic-list button {
  min-height: 52px;
  padding: 0;
  background: transparent;
  font-weight: 700;
}

.chat-main {
  display: grid;
  grid-template-rows: 92px 1fr auto;
  min-width: 0;
}

.chat-header {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: 18px;
  padding: 0 28px;
  border-bottom: 1px solid var(--sf-line);
  background: #fff;
}

.chat-nav {
  display: flex;
  gap: 8px;
}

.nav-button {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: #edf4fd;
  color: var(--sf-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.bot-avatar {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: var(--sf-accent);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.bot-avatar span {
  position: absolute;
  right: 4px;
  bottom: 6px;
  width: 13px;
  height: 13px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #22c55e;
}

.chat-header p {
  margin: 6px 0 0;
  color: var(--sf-muted);
}

.chat-actions {
  display: flex;
  gap: 18px;
  color: var(--sf-accent);
}

.chat-thread {
  min-height: 0;
  padding: 28px 28px 18px;
  overflow: auto;
}

.chat-thread time {
  width: fit-content;
  display: block;
  margin: 0 auto 24px;
  padding: 8px 16px;
  border-radius: 999px;
  background: #dce8f7;
  color: #536073;
}

.message {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.message > svg {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  padding: 10px;
  border-radius: 999px;
  background: var(--sf-accent);
  color: #fff;
}

.message p {
  max-width: 900px;
  margin: 0;
  padding: 18px 20px;
  border-radius: 12px;
  background: #fff;
  line-height: 1.7;
  box-shadow: var(--sf-shadow-soft);
}

.message.user {
  justify-content: flex-end;
}

.message.user p {
  background: var(--sf-primary);
  color: #fff;
  box-shadow: 0 12px 28px rgba(164, 67, 8, 0.18);
}

.chat-composer {
  padding: 16px 18px 10px;
  background: #fff;
}

.quick-replies {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  margin-bottom: 14px;
}

.quick-replies button {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 0 18px;
  border: 1px solid #ead7cb;
  border-radius: 999px;
  background: #fff;
  color: var(--sf-primary);
  font-weight: 800;
}

.chat-composer label {
  min-height: 58px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 18px;
  padding: 0 12px 0 22px;
  border-radius: 12px;
  background: #dce8f7;
  color: #536073;
}

.chat-composer input {
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--sf-ink);
}

.chat-composer label button {
  width: 54px;
  height: 46px;
  border: none;
  border-radius: 10px;
  background: var(--sf-primary);
  color: #fff;
}

.chat-composer label button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.chat-note,
.chat-error {
  width: fit-content;
  margin: 0 auto;
  font-weight: 800;
}

.chat-note {
  color: var(--sf-muted);
}

.chat-error {
  color: var(--sf-danger);
}

.chat-composer p {
  margin: 10px 0 0;
  color: var(--sf-muted);
  text-align: center;
  font-size: 12px;
}

@media (max-width: 900px) {
  .support-page {
    display: block;
  }

  .support-sidebar {
    display: none;
  }

  .chat-main {
    min-height: 100vh;
    grid-template-rows: 82px 1fr auto;
  }

  .chat-header {
    padding: 0 18px;
    grid-template-columns: auto auto 1fr auto;
  }

  .chat-thread {
    padding: 22px 16px;
  }

  .message {
    gap: 10px;
  }

  .message p {
    max-width: 82vw;
  }

  .desktop-back {
    display: none;
  }
}
</style>
