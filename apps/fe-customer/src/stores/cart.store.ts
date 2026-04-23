import { defineStore } from "pinia";
import { customerCartApi, getApiErrorMessage, voucherApi } from "@/api/customer";
import { cartItems, type Product } from "@/data/storefront";
import { useUiStore } from "@/stores/ui.store";

const STORAGE_KEY = "fe_customer_cart";

export interface CartLine {
  id: string;
  variantId?: string;
  product: Product;
  variant: string;
  quantity: number;
}

interface StoredCart {
  items?: CartLine[];
  voucherCode?: string;
  voucherDiscount?: number;
}

const getInitialItems = (): CartLine[] =>
  import.meta.env.VITE_USE_DEMO_CART === "true"
    ? cartItems.map((item) => ({
        id: item.id,
        variantId: item.product.variantId || item.product.variants?.[0]?.id,
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
      }))
    : [];

const readStoredCart = () => {
  const fallback = { items: getInitialItems(), voucherCode: "", voucherDiscount: 0 };
  if (typeof localStorage === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as StoredCart | CartLine[];
    if (Array.isArray(parsed)) return { ...fallback, items: parsed };
    return {
      items: Array.isArray(parsed.items) ? parsed.items : fallback.items,
      voucherCode: parsed.voucherCode || "",
      voucherDiscount: Number(parsed.voucherDiscount || 0),
    };
  } catch {
    return fallback;
  }
};

export const useCartStore = defineStore("customer-cart", {
  state: () => ({
    items: [] as CartLine[],
    voucherCode: "",
    voucherDiscount: 0,
    voucherMessage: "",
    voucherApplying: false,
  }),
  getters: {
    count: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: (state) => state.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    shippingFee: () => 0,
    discount(state): number {
      const subtotal = state.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      return Math.min(Number(state.voucherDiscount || 0), subtotal);
    },
    total(): number {
      return this.subtotal + this.shippingFee - this.discount;
    },
  },
  actions: {
    hydrate() {
      const stored = readStoredCart();
      this.items = stored.items;
      this.voucherCode = stored.voucherCode;
      this.voucherDiscount = stored.voucherDiscount;
    },
    persist() {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          items: this.items,
          voucherCode: this.voucherCode,
          voucherDiscount: this.voucherDiscount,
        }),
      );
    },
    clearVoucher(message = "") {
      this.voucherCode = "";
      this.voucherDiscount = 0;
      this.voucherMessage = message;
      this.persist();
    },
    async applyVoucher(code: string, shippingFee = 0) {
      const ui = useUiStore();
      const normalizedCode = code.trim().toUpperCase();

      if (!normalizedCode) {
        this.clearVoucher("Vui lòng nhập mã giảm giá.");
        return false;
      }

      if (!this.items.length) {
        this.clearVoucher("Giỏ hàng đang trống.");
        return false;
      }

      this.voucherApplying = true;
      this.voucherMessage = "";
      try {
        const result = await voucherApi.validate({
          code: normalizedCode,
          subtotal: this.subtotal,
          shipping_fee: shippingFee,
        });
        this.voucherCode = result.code;
        this.voucherDiscount = result.discount;
        this.voucherMessage = `Đã áp dụng mã ${result.code}.`;
        this.persist();
        ui.showToast(`Đã áp dụng mã ${result.code}.`);
        return true;
      } catch (error) {
        this.clearVoucher(getApiErrorMessage(error, "Không thể áp dụng mã giảm giá."));
        return false;
      } finally {
        this.voucherApplying = false;
      }
    },
    addProduct(product: Product, quantity = 1, variant?: string) {
      const ui = useUiStore();
      const variantId = product.variantId || product.variants?.[0]?.id || product.id;
      const id = `${product.id}:${variantId}`;
      const current = this.items.find((item) => item.id === id);

      if (current) {
        current.quantity += quantity;
      } else {
        this.items.push({
          id,
          variantId,
          product,
          variant: variant || product.variants?.[0]?.label || "Mặc định",
          quantity,
        });
      }

      this.persist();
      ui.showToast(`Đã thêm ${product.name} vào giỏ hàng.`);
    },
    increase(id: string) {
      const item = this.items.find((entry) => entry.id === id);
      if (!item) return;
      item.quantity += 1;
      this.persist();
    },
    decrease(id: string) {
      const item = this.items.find((entry) => entry.id === id);
      if (!item) return;
      item.quantity = Math.max(1, item.quantity - 1);
      this.persist();
    },
    updateQuantity(id: string, quantity: number) {
      const item = this.items.find((entry) => entry.id === id);
      if (!item) return;
      item.quantity = Math.max(1, quantity);
      this.persist();
    },
    remove(id: string) {
      this.items = this.items.filter((entry) => entry.id !== id);
      if (!this.items.length) this.clearVoucher();
      this.persist();
    },
    clear() {
      this.items = [];
      this.clearVoucher();
      this.persist();
    },
    async syncToServer() {
      const syncableItems = this.items
        .map((item) => ({
          ...item,
          variantId: item.variantId || item.product.variantId || item.product.variants?.[0]?.id,
        }))
        .filter((item) => Boolean(item.variantId));

      if (syncableItems.length !== this.items.length) {
        throw new Error("Một số sản phẩm chưa có biến thể hợp lệ để đồng bộ giỏ hàng.");
      }

      const serverCart = await customerCartApi.getCart().catch(() => ({ items: [] }));
      const serverItems = Array.isArray(serverCart?.items) ? serverCart.items : [];
      const localVariantIds = new Set(syncableItems.map((item) => item.variantId));

      await Promise.all(
        serverItems
          .filter((item: any) => item.id && !localVariantIds.has(item.variant_id))
          .map((item: any) => customerCartApi.removeItem(item.id).catch(() => null)),
      );

      for (const item of syncableItems) {
        const serverItem = serverItems.find((entry: any) => entry.variant_id === item.variantId);
        if (serverItem?.id) {
          await customerCartApi.updateItem(serverItem.id, item.quantity);
        } else {
          await customerCartApi.addItem({ variant_id: item.variantId as string, quantity: item.quantity });
        }
      }
    },
  },
});
