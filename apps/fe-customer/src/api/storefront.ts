import { apiClient, unwrapApiData } from "@/api/http";
import { type Category, type Product } from "@/data/storefront";

interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

interface ApiCategory {
  id?: string;
  slug?: string | null;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  image?: string | null;
  children?: ApiCategory[];
}

interface ApiProductImage {
  url?: string | null;
  image_url?: string | null;
}

interface ApiProductVariant {
  id?: string;
  price?: number | string | null;
  stock?: number | string | null;
  sku?: string | null;
  sku_code?: string | null;
  image_url?: string | null;
  variant_values?: Array<{
    attribute_value?: {
      id?: string | null;
      value?: string | null;
      attribute?: {
        id?: string | null;
        name?: string | null;
      } | null;
    } | null;
  }>;
}

interface ApiProduct {
  id?: string;
  slug?: string | null;
  name?: string | null;
  description?: string | null;
  category_id?: string | null;
  category?: ApiCategory | null;
  images?: ApiProductImage[];
  image_url?: string | null;
  thumbnail_url?: string | null;
  base_price?: number | string | null;
  price?: number | string | null;
  compare_at_price?: number | string | null;
  old_price?: number | string | null;
  rating_avg?: number | string | null;
  rating?: number | string | null;
  review_count?: number | string | null;
  rating_count?: number | string | null;
  badge?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  variants?: ApiProductVariant[];
}

interface ApiPost {
  id?: string;
  slug?: string | null;
  title?: string | null;
  excerpt?: string | null;
  summary?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  published_at?: string | null;
  comment_count?: number | string | null;
  category?: {
    name?: string | null;
  } | null;
  blog_category?: {
    name?: string | null;
  } | null;
}

interface ApiStoreLocation {
  id?: string;
  name?: string | null;
  short_name?: string | null;
  address?: string | null;
  phone?: string | null;
  opening_hours?: string | null;
  hours?: string | null;
  distance?: string | number | null;
  status?: string | null;
  is_active?: boolean;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  is_active?: boolean;
  has_variant?: boolean;
}

const fallbackImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='900' viewBox='0 0 1200 900'%3E%3Crect width='1200' height='900' fill='%23e8eef7'/%3E%3Cg fill='none' stroke='%23b3c1d6' stroke-width='24'%3E%3Crect x='180' y='150' width='840' height='600' rx='36'/%3E%3Cpath d='M260 620l170-180 135 120 170-210 205 270'/%3E%3Ccircle cx='415' cy='325' r='52'/%3E%3C/g%3E%3C/svg%3E";

const colorToneMap: Record<string, string> = {
  den: "#111827",
  black: "#111827",
  trang: "#f8fafc",
  white: "#f8fafc",
  xam: "#9ca3af",
  ghi: "#9ca3af",
  bac: "#cbd5e1",
  xanh: "#2563eb",
  "xanh-duong": "#2563eb",
  xanhduong: "#2563eb",
  navy: "#1e3a8a",
  do: "#dc2626",
  hong: "#ec4899",
  xanhla: "#16a34a",
  "xanh-la": "#16a34a",
  vang: "#eab308",
  kem: "#f1e7d5",
  be: "#d6bfa5",
  nau: "#8b5e3c",
  cam: "#f97316",
  tim: "#7c3aed",
};

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeOptionValue = (value: string) => normalizeSlug(value);

const sizePriorityMap: Record<string, number> = {
  xxxs: 0,
  xxs: 1,
  xs: 2,
  s: 3,
  m: 4,
  l: 5,
  xl: 6,
  xxl: 7,
  xxxl: 8,
};

const sizeKeywordPriority: Array<[string, number]> = [
  ["sieunho", 0],
  ["sieu-nho", 0],
  ["ratnho", 1],
  ["rat-nho", 1],
  ["nho", 3],
  ["vua", 4],
  ["trungbinh", 4],
  ["trung-binh", 4],
  ["lon", 5],
  ["ratlon", 7],
  ["rat-lon", 7],
  ["sieulon", 8],
  ["sieu-lon", 8],
];

const getSizeRank = (value: string) => {
  const normalized = normalizeOptionValue(value).replace(/-/g, "");
  if (normalized in sizePriorityMap) return sizePriorityMap[normalized]!;

  const compact = normalized.replace(/\s+/g, "");
  if (compact in sizePriorityMap) return sizePriorityMap[compact]!;

  const numericMatch = compact.match(/^(\d+(?:[.,]\d+)?)(cm|mm|m)?$/i);
  if (numericMatch) {
    const amount = Number(numericMatch[1]?.replace(",", "."));
    const unit = (numericMatch[2] || "").toLowerCase();
    const multiplier = unit === "m" ? 100 : unit === "mm" ? 0.1 : 1;
    return Number.isFinite(amount) ? 100 + amount * multiplier : null;
  }

  for (const [keyword, rank] of sizeKeywordPriority) {
    if (compact.includes(keyword.replace(/-/g, ""))) return rank;
  }

  return null;
};

const sortOptionValues = (
  label: string,
  values: Array<{ value: string; normalizedValue: string; variantIds: string[]; inStock: boolean }>,
) => {
  const normalizedLabel = normalizeOptionValue(label);
  const isSizeGroup = normalizedLabel.includes("size") || normalizedLabel.includes("kich-thuoc");
  if (!isSizeGroup) return values;

  return [...values].sort((left, right) => {
    const leftRank = getSizeRank(left.value);
    const rightRank = getSizeRank(right.value);

    if (leftRank != null && rightRank != null && leftRank !== rightRank) return leftRank - rightRank;
    if (leftRank != null && rightRank == null) return -1;
    if (leftRank == null && rightRank != null) return 1;
    return left.value.localeCompare(right.value, "vi", { numeric: true, sensitivity: "base" });
  });
};

const formatDate = (value?: string | null) => {
  if (!value) return "Gần đây";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Gần đây";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getProductImages = (product: ApiProduct) => {
  const images =
    product.images
      ?.map((image) => image.url || image.image_url)
      .filter((image): image is string => Boolean(image)) || [];

  const primary = product.image_url || product.thumbnail_url;
  if (primary && !images.includes(primary)) images.unshift(primary);

  return images.length ? images : [fallbackImage];
};

const getVariantLabel = (variant: ApiProductVariant) => {
  const values =
    variant.variant_values
      ?.map((entry) => {
        const attribute = entry.attribute_value?.attribute?.name;
        const value = entry.attribute_value?.value;
        return attribute && value ? `${attribute}: ${value}` : value;
      })
      .filter((value): value is string => Boolean(value)) || [];

  return values.join(" / ") || variant.sku_code || variant.sku || "Mặc định";
};

const inferSwatchColor = (value: string) => {
  const normalized = normalizeOptionValue(value);
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value;
  return colorToneMap[normalized];
};

const isColorAttribute = (label: string) => {
  const normalized = normalizeOptionValue(label);
  return normalized.includes("mau") || normalized.includes("color");
};

export const mapProduct = (product: ApiProduct): Product => {
  const id = product.id || normalizeSlug(product.name || "product");
  const variants =
    product.variants?.map((variant) => {
      const values =
        variant.variant_values
          ?.map((entry) => {
            const attributeLabel = entry.attribute_value?.attribute?.name?.trim();
            const value = entry.attribute_value?.value?.trim();
            if (!attributeLabel || !value) return null;

            return {
              attributeKey:
                entry.attribute_value?.attribute?.id || normalizeOptionValue(attributeLabel),
              attributeLabel,
              value,
              normalizedValue: normalizeOptionValue(value),
            };
          })
          .filter((value): value is NonNullable<typeof value> => Boolean(value)) || [];

      return {
        id: variant.id || id,
        label: getVariantLabel(variant),
        price: toNumber(variant.price, toNumber(product.price || product.base_price)),
        stock: toNumber(variant.stock, 0),
        sku: variant.sku_code || variant.sku || undefined,
        image: variant.image_url || undefined,
        values,
      };
    }) || [];

  const firstVariant = variants[0];
  const images = getProductImages(product);
  const categoryName = product.category?.name || "Sản phẩm";
  const categorySlug =
    product.category?.slug ||
    product.category?.id ||
    product.category_id ||
    normalizeSlug(categoryName);
  const price = firstVariant?.price || toNumber(product.price || product.base_price);
  const oldPrice = toNumber(product.compare_at_price || product.old_price);
  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const optionGroupMap = new Map<
    string,
    {
      key: string;
      label: string;
      type: "swatch" | "button";
      values: Map<
        string,
        { value: string; normalizedValue: string; variantIds: string[]; inStock: boolean }
      >;
    }
  >();

  for (const variant of variants) {
    for (const value of variant.values) {
      const currentGroup = optionGroupMap.get(value.attributeKey) || {
        key: value.attributeKey,
        label: value.attributeLabel,
        type: isColorAttribute(value.attributeLabel) ? "swatch" : "button",
        values: new Map(),
      };
      const currentValue = currentGroup.values.get(value.normalizedValue) || {
        value: value.value,
        normalizedValue: value.normalizedValue,
        variantIds: [],
        inStock: false,
      };

      currentValue.variantIds = [...new Set([...currentValue.variantIds, variant.id])];
      currentValue.inStock = currentValue.inStock || variant.stock > 0;
      currentGroup.values.set(value.normalizedValue, currentValue);
      optionGroupMap.set(value.attributeKey, currentGroup);
    }
  }

  const optionGroups = [...optionGroupMap.values()].map((group) => ({
    key: group.key,
    label: group.label,
    type: group.type,
    values: sortOptionValues(group.label, [...group.values.values()]),
  }));

  const swatches = optionGroups
    .filter((group) => group.type === "swatch")
    .flatMap((group) =>
      group.values.map((value) => ({
        label: value.value,
        value: inferSwatchColor(value.value) || value.value,
      })),
    );

  return {
    id,
    variantId: firstVariant?.id,
    slug: product.slug || id,
    name: product.name || "Sản phẩm",
    category: categorySlug,
    categoryLabel: categoryName,
    price,
    oldPrice: oldPrice > price ? oldPrice : undefined,
    rating: toNumber(product.rating_avg ?? product.rating, 0),
    ratingCount: toNumber(product.review_count || product.rating_count, 0),
    image: images[0] || fallbackImage,
    badge: product.badge || undefined,
    colors: swatches.map((swatch) => swatch.value).filter((value) => value.startsWith("#")),
    swatches,
    inStock: variants.length ? totalStock > 0 : product.is_active !== false,
    isNew: Boolean(
      product.created_at &&
        Date.now() - new Date(product.created_at).getTime() < 1000 * 60 * 60 * 24 * 30,
    ),
    description: product.description,
    images,
    optionGroups,
    variants,
  };
};

export const mapCategory = (category: ApiCategory, index = 0): Category => {
  const children = (category.children || []).map((child, childIndex) =>
    mapCategory(child, childIndex),
  );

  return {
    id: category.id,
    slug:
      category.slug || category.id || normalizeSlug(category.name || `category-${index}`),
    name: category.name || "Danh mục",
    caption: category.description || "Bộ sưu tập của cửa hàng",
    image: category.image_url || category.image || fallbackImage,
    size: index === 0 ? "large" : index === 3 ? "wide" : "small",
    children,
  };
};

export const mapPost = (post: ApiPost, index = 0) => ({
  slug: post.slug || post.id || normalizeSlug(post.title || `post-${index}`),
  title: post.title || "Bài viết",
  excerpt: post.excerpt || post.summary || "Cập nhật mới nhất từ cửa hàng.",
  category: post.blog_category?.name || post.category?.name || "Blog",
  date: formatDate(post.published_at || post.created_at),
  comments: toNumber(post.comment_count, 0),
  image: post.cover_image_url || post.thumbnail_url || post.image_url || fallbackImage,
  content: post.content,
});

export const mapStoreLocation = (storeLocation: ApiStoreLocation, index = 0) => ({
  id: storeLocation.id || `store-${index}`,
  name: storeLocation.name || `The Merchant - ${index + 1}`,
  shortName: storeLocation.short_name || storeLocation.name || `Store ${index + 1}`,
  address: storeLocation.address || "Địa chỉ đang cập nhật",
  phone: storeLocation.phone || "Đang cập nhật",
  hours: storeLocation.opening_hours || storeLocation.hours || "08:00 - 22:00",
  distance: storeLocation.distance ? String(storeLocation.distance) : "",
  status: storeLocation.status || (storeLocation.is_active === false ? "CLOSED" : "OPEN"),
  selected: index === 0,
});

export const storefrontApi = {
  async getProducts(params: ProductQuery = {}) {
    const response = await apiClient.get("/storefront/products", {
      params: { is_active: true, limit: 24, ...params },
    });
    const payload = unwrapApiData<PaginatedResponse<ApiProduct> | ApiProduct[]>(response);
    const list = Array.isArray(payload) ? payload : payload?.data || [];
    return list.map(mapProduct);
  },

  async getProductDetail(identifier: string) {
    const response = await apiClient.get(`/storefront/products/${identifier}`);
    const payload = unwrapApiData<ApiProduct>(response);
    return mapProduct(payload);
  },

  async getProductBySlugOrId(identifier: string) {
    try {
      return await this.getProductDetail(identifier);
    } catch {
      const products = await this.getProducts({ limit: 100 });
      return (
        products.find((product) => product.slug === identifier || product.id === identifier) ||
        null
      );
    }
  },

  async getCategories() {
    const response = await apiClient.get("/storefront/categories");
    const payload = unwrapApiData<PaginatedResponse<ApiCategory> | ApiCategory[]>(response);
    const list = Array.isArray(payload) ? payload : payload?.data || [];
    return list.map(mapCategory);
  },

  async getBlogs(
    params: { page?: number; limit?: number; search?: string; blog_category_id?: string } = {},
  ) {
    const response = await apiClient.get("/storefront/blogs", {
      params: { limit: 12, ...params },
    });
    const payload = unwrapApiData<PaginatedResponse<ApiPost> | ApiPost[]>(response);
    const list = Array.isArray(payload) ? payload : payload?.data || [];
    return list.map(mapPost);
  },

  async getBlog(identifier: string) {
    const response = await apiClient.get(`/storefront/blogs/${identifier}`);
    const payload = unwrapApiData<ApiPost>(response);
    return mapPost(payload);
  },

  async getBlogCategories() {
    const response = await apiClient.get("/storefront/blog-categories");
    const payload = unwrapApiData<PaginatedResponse<ApiCategory> | ApiCategory[]>(response);
    const list = Array.isArray(payload) ? payload : payload?.data || [];
    return list.map((category, index) => category.name || mapCategory(category, index).name);
  },

  async getStores() {
    const response = await apiClient.get("/storefront/stores");
    const payload = unwrapApiData<
      PaginatedResponse<ApiStoreLocation> | ApiStoreLocation[]
    >(response);
    const list = Array.isArray(payload) ? payload : payload?.data || [];
    return list.map(mapStoreLocation);
  },

  async getShopProfile() {
    const response = await apiClient.get("/storefront/shop-profile");
    return unwrapApiData<{
      slug: string;
      store_name: string;
      store_description: string;
      logo_url: string;
      favicon_url: string;
      banner_url: string;
      primary_color: string;
      secondary_color: string;
      phone: string;
      email: string;
      address: string;
    }>(response);
  },
};
