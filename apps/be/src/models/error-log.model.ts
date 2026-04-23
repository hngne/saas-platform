import mongoose, { Schema, Document } from "mongoose";

/**
 * Error Log — Ghi lại mọi lỗi xảy ra trên hệ thống.
 * Bao gồm stack trace đầy đủ + context user/tenant để debug nhanh.
 */
export interface IErrorLog extends Document {
  tenant_id?: string;
  tenant_slug?: string;
  user_id?: string;
  user_type?: "USER" | "CUSTOMER" | "ADMIN";
  level: "ERROR" | "WARN" | "INFO";
  message: string;
  stack_trace?: string;
  endpoint: string;
  method: string;
  status_code: number;
  request_body?: Record<string, any>;
  ip_address: string;
  user_agent?: string;
  created_at: Date;
}

const errorLogSchema = new Schema<IErrorLog>(
  {
    tenant_id: { type: String, index: true },
    tenant_slug: { type: String },
    user_id: { type: String },
    user_type: { type: String, enum: ["USER", "CUSTOMER", "ADMIN"] },
    level: {
      type: String,
      enum: ["ERROR", "WARN", "INFO"],
      required: true,
      index: true,
    },
    message: { type: String, required: true },
    stack_trace: { type: String },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    status_code: { type: Number, required: true },
    request_body: { type: Schema.Types.Mixed },
    ip_address: { type: String, default: "unknown" },
    user_agent: { type: String },
    created_at: { type: Date, default: Date.now },
  },
  {
    collection: "error_logs",
    versionKey: false,
  },
);

// TTL: Tự xóa sau 60 ngày
errorLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 60 * 24 * 3600 });
errorLogSchema.index({ tenant_id: 1, level: 1, created_at: -1 });

export const ErrorLog = mongoose.model<IErrorLog>("ErrorLog", errorLogSchema);
