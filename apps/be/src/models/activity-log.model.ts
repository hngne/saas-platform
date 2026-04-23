import mongoose, { Schema, Document } from "mongoose";

/**
 * Activity Log — Ghi lại mọi hành động nghiệp vụ của user trên hệ thống.
 * Ví dụ: Tạo đơn hàng, Đăng nhập, Cập nhật sản phẩm, ...
 */
export interface IActivityLog extends Document {
  tenant_id: string;
  tenant_slug: string;
  user_id: string;
  user_type: "USER" | "CUSTOMER" | "ADMIN";
  user_name: string;
  action: string;
  target: string;
  target_id?: string;
  details?: Record<string, any>;
  ip_address: string;
  user_agent?: string;
  created_at: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    tenant_id: { type: String, required: true, index: true },
    tenant_slug: { type: String, required: true },
    user_id: { type: String, required: true, index: true },
    user_type: {
      type: String,
      enum: ["USER", "CUSTOMER", "ADMIN"],
      required: true,
    },
    user_name: { type: String, default: "" },
    action: { type: String, required: true, index: true },
    target: { type: String, required: true },
    target_id: { type: String },
    details: { type: Schema.Types.Mixed },
    ip_address: { type: String, default: "unknown" },
    user_agent: { type: String },
    created_at: { type: Date, default: Date.now },
  },
  {
    collection: "activity_logs",
    versionKey: false,
  },
);

// TTL: Tự xóa log sau 90 ngày
activityLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
// Composite index tra cứu nhanh
activityLogSchema.index({ tenant_id: 1, created_at: -1 });

export const ActivityLog = mongoose.model<IActivityLog>("ActivityLog", activityLogSchema);
