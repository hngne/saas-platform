import mongoose, { Schema, Document } from "mongoose";

/**
 * Payment Log — Ghi lại mọi giao dịch thanh toán raw (request/response với VNPay).
 * Giữ nguyên bản raw để đối soát, debug khi cần.
 */
export interface IPaymentLog extends Document {
  tenant_id: string;
  tenant_slug: string;
  order_id: string;
  customer_id?: string;
  gateway: "VNPAY";
  action: "CREATE_URL" | "IPN" | "RETURN";
  raw_request?: Record<string, any>;
  raw_response?: Record<string, any>;
  status: "SUCCESS" | "FAILED" | "PENDING";
  amount?: number;
  created_at: Date;
}

const paymentLogSchema = new Schema<IPaymentLog>(
  {
    tenant_id: { type: String, required: true, index: true },
    tenant_slug: { type: String, required: true },
    order_id: { type: String, required: true, index: true },
    customer_id: { type: String },
    gateway: { type: String, enum: ["VNPAY"], required: true },
    action: {
      type: String,
      enum: ["CREATE_URL", "IPN", "RETURN"],
      required: true,
    },
    raw_request: { type: Schema.Types.Mixed },
    raw_response: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "PENDING"],
      required: true,
    },
    amount: { type: Number },
    created_at: { type: Date, default: Date.now },
  },
  {
    collection: "payment_logs",
    versionKey: false,
  },
);

// TTL: 180 ngày (6 tháng — cần giữ lâu hơn để đối soát)
paymentLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });
paymentLogSchema.index({ tenant_id: 1, order_id: 1 });

export const PaymentLog = mongoose.model<IPaymentLog>("PaymentLog", paymentLogSchema);
