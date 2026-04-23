import { apiClient, unwrapApiData, type ApiEnvelope } from "@/api/http";
import { mapProduct } from "@/api/storefront";
import type { Product } from "@/data/storefront";

interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
}

export interface CustomerAddress {
  id: string;
  receiver_name: string;
  phone: string;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  address_detail: string;
  is_default?: boolean;
}

export type CustomerAddressPayload = Omit<CustomerAddress, "id">;

export interface CustomerProfile extends CustomerUser {
  addresses?: CustomerAddress[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
  phone?: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: CustomerUser;
}

export interface ShippingMethod {
  id: string;
  name: string;
  type?: string | null;
  fee: number;
  description?: string | null;
  estimated_days?: string | null;
}

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  open_time?: string | null;
  close_time?: string | null;
  is_active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
}

export interface ReverseGeocodeResult {
  display_name: string;
  province: string;
  district: string;
  ward: string;
  road: string;
  house_number: string;
  address_detail: string;
  raw?: Record<string, any>;
}

export interface CheckoutPayload {
  receiver_name: string;
  receiver_phone: string;
  shipping_address: string;
  shipping_method_id?: string;
  pickup_store_id?: string;
  voucher_code?: string;
  payment_method: "COD" | "VNPAY";
  note?: string;
}

export interface VoucherPreview {
  valid: boolean;
  code: string;
  discount: number;
  subtotal: number;
  shipping_fee: number;
  total: number;
  voucher?: {
    id: string;
    code: string;
    name?: string | null;
    discount_type: "FIXED" | "PERCENT" | string;
    discount_value: number | string;
    max_discount?: number | string | null;
    min_order_value?: number | string | null;
  };
}

export interface OrderItem {
  id: string;
  productId?: string;
  variantId?: string;
  name: string;
  variant: string;
  image: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CustomerOrder {
  id: string;
  code: string;
  date: string;
  createdAt?: string | null;
  status: string;
  statusLabel: string;
  paymentMethod: "COD" | "VNPAY" | string;
  paymentStatus: string;
  paymentStatusLabel: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  receiverName?: string | null;
  receiverPhone?: string | null;
  shippingAddress?: string | null;
  note?: string | null;
  items: OrderItem[];
  shippingMethod?: ShippingMethod | null;
  pickupStore?: StoreLocation | null;
  transactionNo?: string | null;
}

export interface ProductReview {
  id: string;
  customerId?: string | null;
  orderId?: string | null;
  productId?: string | null;
  name: string;
  avatar?: string | null;
  rating: number;
  text: string;
  date: string;
  images: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  text: string;
  type?: string | null;
  unread: boolean;
  createdAt?: string | null;
  time: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string | null;
}

const defaultImage =
  "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=700&q=80";

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const relativeTime = (value?: string | null) => {
  if (!value) return "Vừa xong";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa xong";
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

const statusLabels: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PROCESSING: "Đang xử lý",
  CONFIRMED: "Đã xác nhận",
  SHIPPED: "Đang giao",
  DELIVERED: "Đã giao",
  COMPLETED: "Đã giao",
  CANCELLED: "Đã hủy",
  FAILED: "Thất bại",
};

const paymentLabels: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán lỗi",
  REFUNDED: "Đã hoàn tiền",
  EXPIRED: "Quá hạn thanh toán",
};

const orderStatusLabelsVi: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PROCESSING: "Đang xử lý",
  CONFIRMED: "Đã xác nhận",
  SHIPPED: "Đang giao",
  DELIVERED: "Đã giao",
  COMPLETED: "Đã giao",
  CANCELLED: "Đã hủy",
  FAILED: "Thất bại",
};

const paymentStatusLabelsVi: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán lỗi",
  REFUNDED: "Đã hoàn tiền",
  EXPIRED: "Quá hạn thanh toán",
};

const getImageUrl = (entity: any) => {
  const image = entity?.image_url || entity?.url || entity?.thumbnail_url;
  if (image) return image;
  const firstImage = entity?.images?.[0];
  return firstImage?.url || firstImage?.image_url || defaultImage;
};

const getVariantLabel = (variant: any) => {
  const values =
    variant?.variant_values
      ?.map((entry: any) => {
        const attribute = entry.attribute_value?.attribute?.name;
        const value = entry.attribute_value?.value;
        return attribute && value ? `${attribute}: ${value}` : value;
      })
      .filter(Boolean) || [];

  return values.join(" / ") || variant?.sku || "Mặc định";
};

const parseImageList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

export const getApiErrorMessage = (error: unknown, fallback = "Có lỗi xảy ra. Vui lòng thử lại.") => {
  const data = (error as { response?: { data?: ApiEnvelope<unknown> } })?.response?.data;
  if (typeof data?.message === "string" && data.message) return data.message;
  return fallback;
};

export const mapShippingMethod = (method: any): ShippingMethod => ({
  id: method.id,
  name: method.name || "Giao hàng tiêu chuẩn",
  type: method.type,
  fee: toNumber(method.fee, 0),
  description: method.description,
  estimated_days: method.estimated_days,
});

export const mapStoreLocation = (store: any): StoreLocation => ({
  id: store.id,
  name: store.name || "Cửa hàng",
  address: [store.address, store.ward, store.district, store.province].filter(Boolean).join(", "),
  phone: store.phone,
  open_time: store.open_time,
  close_time: store.close_time,
  is_active: store.is_active,
  latitude: store.latitude != null ? Number(store.latitude) : null,
  longitude: store.longitude != null ? Number(store.longitude) : null,
  distance_km: store.distance_km != null ? Number(store.distance_km) : null,
});

export const mapOrder = (order: any): CustomerOrder => {
  const items: OrderItem[] =
    order.items?.map((item: any) => {
      const variant = item.variant || {};
      const product = variant.product || item.product || {};
      const unitPrice = toNumber(item.unit_price ?? item.price ?? variant.price ?? product.base_price);
      const quantity = toNumber(item.quantity, 1);

      return {
        id: item.id || `${variant.id || product.id}-${quantity}`,
        productId: product.id || variant.product_id,
        variantId: variant.id || item.variant_id,
        name: product.name || item.product_name || "Sản phẩm",
        variant: getVariantLabel(variant),
        image: getImageUrl(product),
        quantity,
        unitPrice,
        total: unitPrice * quantity,
      };
    }) || [];

  const status = String(order.order_status || order.status || "PENDING");
  const paymentStatus = String(order.payment_status || order.payment?.status || "PENDING");
  const statusLabel =
    status === "PROCESSING" && paymentStatus === "PAID"
      ? "Đã xác nhận"
      : orderStatusLabelsVi[status] || status;
  const paymentStatusLabel =
    status === "CANCELLED" && paymentStatus !== "PAID"
      ? "Đã hủy thanh toán"
      : paymentStatusLabelsVi[paymentStatus] || paymentStatus;

  return {
    id: order.id,
    code: `#${String(order.id || "").slice(-8).toUpperCase()}`,
    date: formatDate(order.created_at),
    createdAt: order.created_at,
    status,
    statusLabel,
    paymentMethod: order.payment_method || order.payment?.method || "COD",
    paymentStatus,
    paymentStatusLabel,
    subtotal: toNumber(order.subtotal),
    shippingFee: toNumber(order.shipping_fee),
    discount: toNumber(order.discount),
    total: toNumber(order.total),
    receiverName: order.receiver_name,
    receiverPhone: order.receiver_phone,
    shippingAddress: order.shipping_address,
    note: order.note,
    items,
    shippingMethod: order.shipping_method ? mapShippingMethod(order.shipping_method) : null,
    pickupStore: order.pickup_store ? mapStoreLocation(order.pickup_store) : null,
    transactionNo: order.payment?.transaction_id || order.payment?.transaction_no || order.payment?.gateway_transaction_id,
  };
};

export const customerAuthApi = {
  async login(payload: LoginPayload) {
    const response = await apiClient.post("/storefront/auth/login", payload);
    return unwrapApiData<AuthResult>(response);
  },

  async register(payload: RegisterPayload) {
    const response = await apiClient.post("/storefront/auth/register", payload);
    return unwrapApiData<CustomerProfile>(response);
  },

  async logout() {
    const refreshToken = localStorage.getItem("refresh_token");
    await apiClient.post("/storefront/auth/logout", { refreshToken });
  },

  async refresh(refreshToken: string) {
    const response = await apiClient.post("/storefront/auth/refresh", { refreshToken });
    return unwrapApiData<AuthResult>(response);
  },

  async getProfile() {
    const response = await apiClient.get("/storefront/auth/profile");
    return unwrapApiData<CustomerProfile>(response);
  },

  async updateProfile(payload: { name?: string; phone?: string }) {
    const response = await apiClient.put("/storefront/auth/profile", payload);
    return unwrapApiData<CustomerProfile>(response);
  },

  async changePassword(payload: { oldPassword: string; newPassword: string }) {
    await apiClient.put("/storefront/auth/password", payload);
  },
};

export const addressApi = {
  async getAll() {
    const response = await apiClient.get("/storefront/addresses");
    return unwrapApiData<CustomerAddress[]>(response);
  },

  async create(payload: CustomerAddressPayload) {
    const response = await apiClient.post("/storefront/addresses", payload);
    return unwrapApiData<CustomerAddress>(response);
  },

  async update(id: string, payload: Partial<CustomerAddressPayload>) {
    const response = await apiClient.put(`/storefront/addresses/${id}`, payload);
    return unwrapApiData<CustomerAddress>(response);
  },

  async remove(id: string) {
    await apiClient.delete(`/storefront/addresses/${id}`);
  },
};

export const customerCartApi = {
  async getCart() {
    const response = await apiClient.get("/storefront/cart");
    return unwrapApiData<any>(response);
  },

  async addItem(payload: { variant_id: string; quantity: number }) {
    const response = await apiClient.post("/storefront/cart/items", payload);
    return unwrapApiData<any>(response);
  },

  async updateItem(itemId: string, quantity: number) {
    const response = await apiClient.put(`/storefront/cart/items/${itemId}`, { quantity });
    return unwrapApiData<any>(response);
  },

  async removeItem(itemId: string) {
    await apiClient.delete(`/storefront/cart/items/${itemId}`);
  },
};

export const voucherApi = {
  async validate(payload: { code: string; subtotal: number; shipping_fee?: number }) {
    const response = await apiClient.post("/storefront/checkout/voucher", payload);
    return unwrapApiData<VoucherPreview>(response);
  },
};

export const checkoutApi = {
  async getShippingMethods() {
    const response = await apiClient.get("/storefront/shipping-methods");
    const payload = unwrapApiData<ShippingMethod[] | PaginatedResponse<ShippingMethod>>(response);
    const list = Array.isArray(payload) ? payload : payload?.data || [];
    return list.map(mapShippingMethod);
  },

  async getStores() {
    const response = await apiClient.get("/storefront/stores");
    const payload = unwrapApiData<StoreLocation[] | PaginatedResponse<StoreLocation>>(response);
    const list = Array.isArray(payload) ? payload : payload?.data || [];
    return list.map(mapStoreLocation);
  },

  async getNearestStores(lat: number, lng: number) {
    const response = await apiClient.get("/storefront/stores/nearest", { params: { lat, lng } });
    const payload = unwrapApiData<StoreLocation[] | PaginatedResponse<StoreLocation>>(response);
    const list = Array.isArray(payload) ? payload : payload?.data || [];
    return list.map(mapStoreLocation);
  },

  async reverseGeocode(lat: number, lng: number) {
    const response = await apiClient.get("/storefront/geocode/reverse", { params: { lat, lng } });
    return unwrapApiData<ReverseGeocodeResult>(response);
  },

  async checkout(payload: CheckoutPayload) {
    const response = await apiClient.post("/storefront/checkout", payload);
    const data = unwrapApiData<{ order: any } | any>(response);
    return mapOrder(data?.order || data);
  },

  async createPaymentUrl(orderId: string) {
    const response = await apiClient.post("/payment/create_url", { order_id: orderId, language: "vn" });
    const data = unwrapApiData<{ paymentUrl: string }>(response);
    return data.paymentUrl;
  },

  async getOrders(params: { page?: number; limit?: number } = {}) {
    const response = await apiClient.get("/storefront/orders", { params: { page: 1, limit: 20, ...params } });
    const payload = unwrapApiData<PaginatedResponse<any>>(response);
    return {
      data: (payload?.data || []).map(mapOrder),
      meta: payload?.meta,
    };
  },

  async getOrderById(id: string) {
    const response = await apiClient.get(`/storefront/orders/${id}`);
    return mapOrder(unwrapApiData<any>(response));
  },

  async confirmReceived(id: string) {
    const response = await apiClient.patch(`/storefront/orders/${id}/confirm-received`);
    return mapOrder(unwrapApiData<any>(response));
  },
};

export const reviewApi = {
  async getByProduct(productId: string) {
    const response = await apiClient.get(`/storefront/products/${productId}/reviews`, { params: { limit: 20 } });
    const payload = unwrapApiData<{ data: any[]; total?: number; average_rating?: number }>(response);
    return {
      data: (payload?.data || []).map((review) => ({
        id: review.id,
        customerId: review.customer?.id || review.customer_id || null,
        orderId: review.order_id || null,
        productId: review.product_id || productId,
        name: review.customer?.name || "Khách hàng",
        avatar: review.customer?.avatar_url,
        rating: toNumber(review.rating, 5),
        text: review.comment || "",
        date: formatDate(review.created_at),
        images: parseImageList(review.images),
      })) as ProductReview[],
      total: payload?.total || 0,
      average: toNumber(payload?.average_rating, 0),
    };
  },

  async create(payload: { product_id: string; order_id: string; rating: number; comment?: string; images?: string[] }) {
    const response = await apiClient.post("/storefront/reviews", payload);
    return unwrapApiData<ProductReview>(response);
  },
};

export const findCustomerReview = (
  reviews: ProductReview[],
  options: { customerId?: string | null; orderId?: string | null; productId?: string | null },
) =>
  reviews.find(
    (review) =>
      (!options.customerId || review.customerId === options.customerId) &&
      (!options.orderId || review.orderId === options.orderId) &&
      (!options.productId || review.productId === options.productId),
  ) || null;

export const notificationApi = {
  async getAll(params: { page?: number; limit?: number } = {}) {
    const response = await apiClient.get("/notifications", { params: { page: 1, limit: 30, ...params } });
    const payload = unwrapApiData<PaginatedResponse<any> & { unread?: number }>(response);
    return {
      data: (payload?.data || []).map((item) => ({
        id: item.id,
        title: item.title || "Thông báo",
        text: item.body || item.message || "",
        type: item.type,
        unread: item.is_read === false,
        createdAt: item.created_at,
        time: relativeTime(item.created_at),
      })) as NotificationItem[],
      meta: payload?.meta,
      unread: payload?.unread,
    };
  },

  async markAsRead(id: string) {
    await apiClient.put(`/notifications/${id}/read`);
  },

  async markAllAsRead() {
    await apiClient.put("/notifications/read-all");
  },
};

export const chatApi = {
  async send(message: string, sessionId?: string) {
    const response = await apiClient.post("/chat/send", { message, session_id: sessionId });
    return unwrapApiData<any>(response);
  },

  async getSessions() {
    const response = await apiClient.get("/chat/sessions");
    return unwrapApiData<any[]>(response);
  },

  async getHistory(sessionId: string) {
    const response = await apiClient.get(`/chat/sessions/${sessionId}/messages`);
    return unwrapApiData<ChatMessage[]>(response);
  },
};

export const normalizeProductFromOrderItem = (item: OrderItem): Product => ({
  id: item.productId || item.id,
  variantId: item.variantId,
  slug: item.productId || item.id,
  name: item.name,
  category: "order",
  categoryLabel: "Đã mua",
  price: item.unitPrice,
  rating: 0,
  ratingCount: 0,
  image: item.image,
  inStock: true,
});

export { mapProduct };
