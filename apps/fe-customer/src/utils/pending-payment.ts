import type { CustomerOrder } from "@/api/customer";

export const PENDING_VNPAY_ORDER_KEY = "pending_vnpay_order";

export const isPendingVnpayOrder = (order: CustomerOrder | null | undefined) =>
  Boolean(
    order &&
      order.paymentMethod === "VNPAY" &&
      ["PENDING", "FAILED"].includes(order.paymentStatus) &&
      order.status !== "CANCELLED",
  );

export const readPendingVnpayOrder = () => {
  try {
    const raw = localStorage.getItem(PENDING_VNPAY_ORDER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CustomerOrder;
  } catch {
    localStorage.removeItem(PENDING_VNPAY_ORDER_KEY);
    return null;
  }
};

export const savePendingVnpayOrder = (order: CustomerOrder) => {
  localStorage.setItem(PENDING_VNPAY_ORDER_KEY, JSON.stringify(order));
};

export const clearPendingVnpayOrder = () => {
  localStorage.removeItem(PENDING_VNPAY_ORDER_KEY);
};
