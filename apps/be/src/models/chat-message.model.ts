import mongoose, { Schema, Document } from "mongoose";

/**
 * Chat Message — Tin nhắn trong 1 phiên chat AI.
 * Lưu toàn bộ lịch sử hội thoại giữa customer <-> assistant.
 */
export interface IChatMessage extends Document {
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    session_id: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    created_at: { type: Date, default: Date.now },
  },
  {
    collection: "chat_messages",
    versionKey: false,
  },
);

chatMessageSchema.index({ session_id: 1, created_at: 1 });

export const ChatMessage = mongoose.model<IChatMessage>("ChatMessage", chatMessageSchema);
