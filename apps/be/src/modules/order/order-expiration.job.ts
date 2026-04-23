import prisma from "@/configs/database";
import logger from "@/configs/logger";
import { getTenantDB } from "@/configs/tenant-db";
import { PaymentRepository } from "@/modules/payment/payment.repository";

const PAYMENT_TIMEOUT_MS = 60 * 60 * 1000;
const JOB_INTERVAL_MS = 5 * 60 * 1000;

let isRunning = false;
let intervalHandle: NodeJS.Timeout | null = null;

export const expireUnpaidVnpayOrders = async () => {
  if (isRunning) return;

  isRunning = true;
  const expiredBefore = new Date(Date.now() - PAYMENT_TIMEOUT_MS);

  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, db_name: true },
    });

    for (const tenant of tenants) {
      try {
        const db = getTenantDB(tenant.db_name);
        const repo = new PaymentRepository(db);

        const staleOrders = await db.order.findMany({
          where: {
            payment_method: "VNPAY",
            payment_status: { in: ["PENDING", "FAILED"] },
            order_status: { not: "CANCELLED" },
            created_at: { lte: expiredBefore },
            deleted_at: null,
          },
          select: { id: true },
          take: 100,
        });

        let expiredCount = 0;
        for (const order of staleOrders) {
          const result = await repo.expireUnpaidOrderTx(order.id, expiredBefore);
          if (result.expired) expiredCount += 1;
        }

        if (expiredCount > 0) {
          logger.info(
            `[OrderExpiration] Expired ${expiredCount} unpaid VNPay orders for ${tenant.slug}`,
          );
        }
      } catch (error: any) {
        logger.error(
          `[OrderExpiration] Failed for tenant ${tenant.slug}: ${error.message}`,
        );
      }
    }
  } catch (error: any) {
    logger.error(`[OrderExpiration] Job failed: ${error.message}`);
  } finally {
    isRunning = false;
  }
};

export const startOrderExpirationJob = () => {
  if (intervalHandle) return;

  void expireUnpaidVnpayOrders();
  intervalHandle = setInterval(() => {
    void expireUnpaidVnpayOrders();
  }, JOB_INTERVAL_MS);

  logger.info("[OrderExpiration] VNPay unpaid order job started");
};
