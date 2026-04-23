import mongoose, { Schema, Document } from "mongoose";

/**
 * Chat Session — Phiên chat giữa User và AI Chatbot.
 * Hỗ trợ cả Customer (mua hàng) và Merchant (quản lý).
 */
export interface IChatSession extends Document {
  tenant_id: string;
  tenant_slug: string;
  user_id: string;
  user_type: "CUSTOMER" | "USER"; // CUSTOMER = khách, USER = merchant/nhân viên
  user_name?: string;
  title?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const chatSessionSchema = new Schema<IChatSession>(
  {
    tenant_id: { type: String, required: true, index: true },
    tenant_slug: { type: String, required: true },
    user_id: { type: String, required: true, index: true },
    user_type: { type: String, enum: ["CUSTOMER", "USER"], required: true },
    user_name: { type: String },
    title: { type: String, default: "Cuộc hội thoại mới" },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    collection: "chat_sessions",
    versionKey: false,
  },
);

chatSessionSchema.index({ tenant_id: 1, user_id: 1, user_type: 1, created_at: -1 });

export const ChatSession = mongoose.model<IChatSession>("ChatSession", chatSessionSchema);
