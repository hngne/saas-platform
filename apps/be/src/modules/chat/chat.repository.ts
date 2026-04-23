import { ChatSession, IChatSession } from "@/models/chat-session.model";
import { ChatMessage, IChatMessage } from "@/models/chat-message.model";
import { aiConfig } from "@/configs/ai.config";

export class ChatRepository {
  /** Tạo session mới */
  async createSession(data: {
    tenant_id: string;
    tenant_slug: string;
    user_id: string;
    user_type: "CUSTOMER" | "USER";
    user_name?: string;
  }): Promise<IChatSession> {
    return ChatSession.create(data);
  }

  /** Lấy session theo ID */
  async findSessionById(sessionId: string): Promise<IChatSession | null> {
    return ChatSession.findById(sessionId);
  }

  /** Lấy danh sách session của user */
  async findSessionsByUser(
    tenantId: string,
    userId: string,
    userType: string,
  ): Promise<IChatSession[]> {
    return ChatSession.find({
      tenant_id: tenantId,
      user_id: userId,
      user_type: userType,
    })
      .sort({ updated_at: -1 })
      .limit(20)
      .lean();
  }

  /** Lưu tin nhắn */
  async createMessage(data: {
    session_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    metadata?: Record<string, any>;
  }): Promise<IChatMessage> {
    // Cập nhật updated_at của session
    await ChatSession.findByIdAndUpdate(data.session_id, {
      updated_at: new Date(),
    });
    return ChatMessage.create(data);
  }

  /** Lấy lịch sử chat (giới hạn N tin nhắn gần nhất) */
  async getHistory(sessionId: string): Promise<IChatMessage[]> {
    return ChatMessage.find({ session_id: sessionId })
      .sort({ created_at: -1 })
      .limit(aiConfig.maxHistoryMessages)
      .lean()
      .then((msgs) => msgs.reverse()); // Đảo lại thứ tự chronological
  }

  /** Đóng session */
  async closeSession(sessionId: string): Promise<void> {
    await ChatSession.findByIdAndUpdate(sessionId, { is_active: false });
  }

  /** Cập nhật title session (dùng tin nhắn đầu tiên của user) */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await ChatSession.findByIdAndUpdate(sessionId, {
      title: title.slice(0, 100),
    });
  }
}
