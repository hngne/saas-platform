import { env } from "./env";
import logger from "./logger";

export const vnpayConfig = {
  tmnCode: env.VNP_TMN_CODE || "",
  hashSecret: env.VNP_HASH_SECRET || "",
  url: env.VNP_URL,
  returnUrl: env.VNP_RETURN_URL,

  get isConfigured(): boolean {
    return !!(this.tmnCode && this.hashSecret);
  },
};

if (!vnpayConfig.isConfigured) {
  logger.warn("⚠️ VNPay chưa được cấu hình (VNP_TMN_CODE / VNP_HASH_SECRET)");
}
