<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { Heart, Minus, Plus, Share2, ShoppingCart, Star, Ticket, Truck } from "lucide-vue-next";
import ProductCard from "@/components/ProductCard.vue";
import { reviewApi, type ProductReview } from "@/api/customer";
import { storefrontApi } from "@/api/storefront";
import { formatVnd, type Product } from "@/data/storefront";
import { useCartStore } from "@/stores/cart.store";

const route = useRoute();
const cart = useCartStore();
const activeImage = ref(0);
const quantity = ref(1);
const activeTab = ref("description");
const product = ref<Product | null>(null);
const related = ref<Product[]>([]);
const loadError = ref("");
const loading = ref(false);
const reviews = ref<ProductReview[]>([]);
const reviewTotal = ref(0);
const reviewAverage = ref(0);
const selectedOptions = ref<Record<string, string>>({});

const activeVariant = computed(() => {
  if (!product.value?.variants?.length) return null;
  const optionKeys = product.value.optionGroups?.map((group) => group.key) || [];

  return (
    product.value.variants.find((variant) =>
      optionKeys.every((key) => {
        const expected = selectedOptions.value[key];
        if (!expected) return true;
        return variant.values.some(
          (value) => value.attributeKey === key && value.normalizedValue === expected,
        );
      }),
    ) || product.value.variants[0]
  );
});

const currentPrice = computed(() => activeVariant.value?.price || product.value?.price || 0);
const currentStock = computed(
  () => activeVariant.value?.stock ?? (product.value?.inStock ? 1 : 0),
);
const currentVariantLabel = computed(
  () =>
    activeVariant.value?.label ||
    product.value?.variants?.[0]?.label ||
    product.value?.name ||
    "Mặc định",
);

const detailImages = computed(() => {
  const currentProduct = product.value;
  if (!currentProduct) return [];

  const seen = new Set<string>();
  const gallery: string[] = [];

  const pushImage = (image?: string | null) => {
    const normalized = image?.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    gallery.push(normalized);
  };

  pushImage(activeVariant.value?.image);
  (currentProduct.images || []).forEach(pushImage);
  (currentProduct.variants || []).forEach((variant) => pushImage(variant.image));
  pushImage(currentProduct.image);

  return gallery;
});

const canAddToCart = computed(
  () => Boolean(product.value && activeVariant.value && currentStock.value > 0),
);
const isQuantityLocked = computed(() => currentStock.value <= 0);

const getOptionTone = (label: string) => {
  const swatch = product.value?.swatches?.find(
    (item) => item.label.trim().toLowerCase() === label.trim().toLowerCase(),
  );
  return swatch?.value.startsWith("#") ? swatch.value : undefined;
};

const isOptionSelected = (groupKey: string, value: string) =>
  selectedOptions.value[groupKey] === value;

const isOptionAvailable = (groupKey: string, variantIds: string[]) => {
  const currentProduct = product.value;
  if (!currentProduct?.variants?.length) return false;

  return currentProduct.variants.some((variant) => {
    if (!variantIds.includes(variant.id) || variant.stock <= 0) return false;

    return (currentProduct.optionGroups || []).every((group) => {
      if (group.key === groupKey) return true;
      const selected = selectedOptions.value[group.key];
      if (!selected) return true;
      return variant.values.some(
        (value) => value.attributeKey === group.key && value.normalizedValue === selected,
      );
    });
  });
};

const selectOption = (groupKey: string, normalizedValue: string) => {
  selectedOptions.value = {
    ...selectedOptions.value,
    [groupKey]: normalizedValue,
  };
};

const syncDefaultSelections = (currentProduct: Product | null) => {
  if (!currentProduct?.variants?.length) {
    selectedOptions.value = {};
    return;
  }

  const firstVariant = currentProduct.variants[0];
  const nextSelections: Record<string, string> = {};

  for (const group of currentProduct.optionGroups || []) {
    const fromFirstVariant = firstVariant?.values.find(
      (value) => value.attributeKey === group.key,
    );
    const fallbackValue = group.values.find((value) => value.inStock) || group.values[0];
    const selected = fromFirstVariant?.normalizedValue || fallbackValue?.normalizedValue;
    if (selected) nextSelections[group.key] = selected;
  }

  selectedOptions.value = nextSelections;
};

const addToCart = () => {
  if (!product.value || !activeVariant.value) return;

  cart.addProduct(
    {
      ...product.value,
      price: activeVariant.value.price,
      variantId: activeVariant.value.id,
      image: detailImages.value[0] || product.value.image,
    },
    quantity.value,
    currentVariantLabel.value,
  );
};

const loadReviews = async (productId: string, fallbackProduct?: Product | null) => {
  const result = await reviewApi.getByProduct(productId).catch(() => null);
  if (!result) {
    reviews.value = [];
    reviewTotal.value = fallbackProduct?.ratingCount || 0;
    reviewAverage.value = fallbackProduct?.rating || 0;
    return;
  }

  reviews.value = result.data;
  reviewTotal.value = result.total;
  reviewAverage.value = result.average || fallbackProduct?.rating || 0;
};

const loadRelatedProducts = async (currentProduct: Product) => {
  related.value = await storefrontApi
    .getProducts({ category_id: currentProduct.category, limit: 4 })
    .then((items) => items.filter((item) => item.id !== currentProduct.id).slice(0, 3))
    .catch(() => []);
};

watch(
  detailImages,
  (images) => {
    if (!images.length) {
      activeImage.value = 0;
      return;
    }

    if (activeImage.value >= images.length) {
      activeImage.value = 0;
    }
  },
  { immediate: true },
);

watch(
  () => route.params.slug,
  async (identifier) => {
    activeImage.value = 0;
    quantity.value = 1;
    loadError.value = "";
    loading.value = true;
    product.value = null;
    related.value = [];

    try {
      const productResult = await storefrontApi.getProductBySlugOrId(String(identifier));
      product.value = productResult;

      if (!productResult) {
        loadError.value = "Không tìm thấy sản phẩm trong shop hiện tại.";
        reviews.value = [];
        reviewTotal.value = 0;
        reviewAverage.value = 0;
        return;
      }

      syncDefaultSelections(productResult);
      await Promise.all([
        loadReviews(productResult.id, productResult),
        loadRelatedProducts(productResult),
      ]);
    } catch {
      loadError.value = "Không tải được chi tiết sản phẩm. Vui lòng thử lại.";
      reviews.value = [];
      reviewTotal.value = 0;
      reviewAverage.value = 0;
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <section v-if="product" class="detail-page sf-container">
    <nav class="detail-breadcrumb">Trang chủ › {{ product.categoryLabel }} › {{ product.name }}</nav>

    <div class="detail-grid">
      <section class="gallery">
        <div class="gallery-shell">
          <div v-if="detailImages.length > 1" class="thumbs">
            <button
              v-for="(image, index) in detailImages"
              :key="`${product.id}-${image}-${index}`"
              type="button"
              :class="{ active: activeImage === index }"
              @click="activeImage = index"
            >
              <img :src="image" :alt="`${product.name} ${index + 1}`" />
            </button>
          </div>
          <div class="main-photo">
            <img :src="detailImages[activeImage] || product.image" :alt="product.name" />
          </div>
        </div>
      </section>

      <aside class="purchase-panel">
        <div class="product-head">
          <div class="product-head__meta">
            <span class="product-category">{{ product.categoryLabel }}</span>
            <span class="product-stock" :class="{ out: currentStock <= 0 }">
              {{ currentStock > 0 ? `Còn ${currentStock} sản phẩm` : "Hết hàng" }}
            </span>
          </div>
          <h1>{{ product.name }}</h1>
          <div class="rating-line">
            <span class="rating-badge">
              <Star :size="15" fill="currentColor" />
              <strong>{{ product.rating.toFixed(1) }}</strong>
            </span>
            <span>{{ reviewTotal || product.ratingCount }} đánh giá</span>
            <span v-if="activeVariant?.sku">SKU: {{ activeVariant.sku }}</span>
          </div>
          <div class="price-line">
            <strong>{{ formatVnd(currentPrice) }}</strong>
            <del v-if="product.oldPrice">{{ formatVnd(product.oldPrice) }}</del>
            <span v-if="product.oldPrice" class="price-badge">Giảm giá</span>
          </div>
        </div>

        <div class="promo-banner">
          <span class="promo-banner__icon"><Ticket :size="18" /></span>
          <div>
            <strong>Ưu đãi theo cửa hàng</strong>
            <small>Voucher và phí vận chuyển sẽ được áp dụng ở bước thanh toán.</small>
          </div>
        </div>

        <div
          v-for="group in product.optionGroups || []"
          :key="group.key"
          class="option-group"
        >
          <div class="option-header">
            <span>{{ group.label }}</span>
            <strong>
              {{
                group.values.find((option) => option.normalizedValue === selectedOptions[group.key])
                  ?.value || "Chưa chọn"
              }}
            </strong>
          </div>

          <div :class="['option-values', { swatch_options: group.type === 'swatch' }]">
            <button
              v-for="option in group.values"
              :key="`${group.key}-${option.normalizedValue}`"
              type="button"
              :class="{
                active: isOptionSelected(group.key, option.normalizedValue),
                disabled: !isOptionAvailable(group.key, option.variantIds),
                swatch: group.type === 'swatch',
              }"
              :disabled="!isOptionAvailable(group.key, option.variantIds)"
              :title="option.value"
              @click="selectOption(group.key, option.normalizedValue)"
            >
              <template v-if="group.type === 'swatch'">
                <span
                  class="swatch-dot"
                  :class="{ text: !getOptionTone(option.value) }"
                  :style="getOptionTone(option.value) ? { background: getOptionTone(option.value) } : undefined"
                >
                  <template v-if="!getOptionTone(option.value)">{{ option.value.slice(0, 1) }}</template>
                </span>
                <span class="swatch-label">{{ option.value }}</span>
              </template>
              <template v-else>{{ option.value }}</template>
            </button>
          </div>
        </div>

        <div class="purchase-meta">
          <div class="purchase-meta__item">
            <span>Số lượng</span>
            <div class="qty">
              <button
                type="button"
                :disabled="isQuantityLocked || quantity <= 1"
                @click="quantity = Math.max(1, quantity - 1)"
              >
                <Minus :size="15" />
              </button>
              <strong>{{ quantity }}</strong>
              <button
                type="button"
                :disabled="isQuantityLocked || quantity >= currentStock"
                @click="quantity = quantity + 1"
              >
                <Plus :size="15" />
              </button>
            </div>
          </div>
          <div class="purchase-meta__item subtle">
            <span>Biến thể đang chọn</span>
            <strong>{{ currentVariantLabel }}</strong>
          </div>
        </div>

        <div class="detail-actions">
          <RouterLink class="sf-button" :class="{ disabled: !canAddToCart }" to="/cart" @click="addToCart">
            Mua ngay
          </RouterLink>
          <button type="button" class="sf-button ghost" :disabled="!canAddToCart" @click="addToCart">
            <ShoppingCart :size="18" /> Thêm vào giỏ hàng
          </button>
        </div>

        <div class="social-actions">
          <button type="button"><Heart :size="16" fill="currentColor" /> Wishlist</button>
          <button type="button"><Share2 :size="16" /> Chia sẻ</button>
        </div>
      </aside>
    </div>

    <section class="tabs">
      <nav>
        <button type="button" :class="{ active: activeTab === 'description' }" @click="activeTab = 'description'">Mô tả sản phẩm</button>
        <button type="button" :class="{ active: activeTab === 'specs' }" @click="activeTab = 'specs'">Biến thể</button>
        <button type="button" :class="{ active: activeTab === 'reviews' }" @click="activeTab = 'reviews'">Đánh giá ({{ reviewTotal || product.ratingCount }})</button>
      </nav>

      <div v-if="activeTab === 'description'" class="tab-panel prose">
        <p>{{ product.description || "Sản phẩm chưa có mô tả chi tiết từ hệ thống." }}</p>
      </div>

      <div v-else-if="activeTab === 'specs'" class="tab-panel variant-panel">
        <div v-if="product.variants?.length" class="variant-list">
          <article v-for="variant in product.variants" :key="variant.id" class="variant-item">
            <strong>{{ variant.label }}</strong>
            <span>{{ formatVnd(variant.price) }}</span>
            <small>{{ variant.stock > 0 ? `Tồn kho: ${variant.stock}` : "Hết hàng" }}</small>
          </article>
        </div>
        <p v-else>Sản phẩm này chỉ có một cấu hình mặc định.</p>
      </div>

      <div v-else class="review-layout">
        <aside class="review-summary">
          <strong>{{ reviewAverage.toFixed(1) }}</strong>
          <span>★★★★★</span>
          <small>Dựa trên {{ reviewTotal || product.ratingCount }} đánh giá</small>
          <button type="button">Viết đánh giá</button>
        </aside>
        <div class="review-list">
          <article v-for="review in reviews" :key="review.id" class="review-item">
            <div class="avatar">{{ review.name.charAt(0) }}</div>
            <div>
              <header>
                <div>
                  <strong>{{ review.name }}</strong>
                  <small>Khách đã mua hàng</small>
                </div>
                <time>{{ review.date }}</time>
              </header>
              <span class="stars">{{ "★".repeat(review.rating) }}{{ "☆".repeat(5 - review.rating) }}</span>
              <p>{{ review.text || "Khách hàng chưa để lại nhận xét chi tiết." }}</p>
            </div>
          </article>

          <div v-if="!reviews.length" class="review-empty">
            Chưa có đánh giá nào cho sản phẩm này.
          </div>
        </div>
      </div>
    </section>

    <section v-if="related.length" class="sf-section related">
      <div class="sf-section-title">
        <h2>Sản phẩm liên quan</h2>
      </div>
      <div class="related-grid">
        <ProductCard v-for="item in related" :key="item.id" :product="item" compact />
      </div>
    </section>
  </section>

  <section v-else class="detail-page sf-container">
    <div class="detail-empty">
      <h1>{{ loading ? "Đang tải sản phẩm" : "Không tìm thấy sản phẩm" }}</h1>
      <p>{{ loadError || "Sản phẩm này không tồn tại hoặc chưa được bật hiển thị trong shop hiện tại." }}</p>
      <RouterLink class="sf-button" to="/products">Xem sản phẩm khác</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.detail-page {
  padding-top: 34px;
}

.detail-empty {
  width: min(720px, 100%);
  margin: 80px auto;
  padding: 42px;
  border-radius: var(--sf-radius-md);
  background: #fff;
  text-align: center;
  box-shadow: var(--sf-shadow-soft);
}

.detail-empty h1 {
  margin: 0 0 12px;
}

.detail-empty p {
  margin: 0 0 24px;
  color: var(--sf-muted);
}

.detail-breadcrumb {
  color: var(--sf-muted);
  font-size: 13px;
  margin-bottom: 22px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(420px, 0.98fr);
  gap: 36px;
  align-items: start;
}

.gallery-shell {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.main-photo {
  border-radius: 0;
  overflow: hidden;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.main-photo img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.thumbs {
  display: grid;
  grid-auto-rows: 72px;
  gap: 8px;
}

.thumbs button {
  padding: 0;
  border: 1px solid #d6deea;
  border-radius: 0;
  overflow: hidden;
  background: #fff;
}

.thumbs button.active {
  border-color: var(--sf-primary);
  box-shadow: inset 0 0 0 1px var(--sf-primary);
}

.thumbs img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.purchase-panel {
  position: sticky;
  top: 88px;
}

.product-head {
  padding: 4px 0 0;
}

.product-head__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.product-category,
.product-stock {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.product-category {
  background: #fff4ec;
  color: #b65210;
}

.product-stock {
  background: #edf7f0;
  color: #1c7c41;
}

.product-stock.out {
  background: #fff1f2;
  color: #be123c;
}

.purchase-panel h1 {
  margin: 0;
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1.14;
  overflow-wrap: anywhere;
}

.rating-line {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
  color: var(--sf-muted);
  font-size: 15px;
}

.rating-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #b65210;
  font-weight: 800;
}

.price-line {
  display: flex;
  align-items: end;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.price-line strong {
  color: var(--sf-primary);
  font-size: clamp(30px, 2.8vw, 42px);
  line-height: 1;
}

.price-line del {
  color: var(--sf-muted);
  font-size: 18px;
}

.price-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: #fff1f2;
  color: #be123c;
  font-size: 13px;
  font-weight: 800;
}

.promo-banner {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 22px;
  padding: 16px 18px;
  border-radius: 6px;
  background: linear-gradient(90deg, #c45a18 0%, #df7a28 100%);
  color: #fff;
}

.promo-banner__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  flex: 0 0 auto;
}

.promo-banner strong,
.promo-banner small {
  display: block;
}

.promo-banner strong {
  font-size: 16px;
}

.promo-banner small {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.86);
  line-height: 1.5;
}

.option-group {
  margin-top: 18px;
  padding: 0 0 18px;
  border: none;
  border-bottom: 1px solid #ebeef3;
  border-radius: 0;
  background: transparent;
}

.option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.option-header > span {
  color: #334155;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.option-header > strong {
  color: var(--sf-ink);
  font-size: 14px;
}

.option-values {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.option-values button,
.qty {
  min-height: 44px;
  border: 1px solid #d7dee9;
  border-radius: 4px;
  background: #fff;
  color: var(--sf-ink);
  font-weight: 700;
}

.option-values button {
  padding: 0 14px;
}

.option-values button.active {
  border-color: var(--sf-primary);
  color: var(--sf-primary);
  background: #fff7f0;
  box-shadow: 0 0 0 2px rgba(182, 82, 16, 0.12);
}

.option-values button.disabled {
  opacity: 0.45;
}

.option-values button.swatch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding-right: 16px;
}

.swatch-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: 1px solid rgba(15, 23, 42, 0.15);
  background: #f1f5f9;
  color: #475569;
  font-size: 10px;
  font-weight: 800;
  flex: 0 0 auto;
}

.swatch-dot.text {
  text-transform: uppercase;
}

.swatch-label {
  font-size: 14px;
}

.purchase-meta {
  display: grid;
  grid-template-columns: minmax(0, 160px) 1fr;
  gap: 14px;
  margin-top: 22px;
}

.purchase-meta__item {
  padding: 18px 18px;
  border: 1px solid #ebeff5;
  border-radius: 6px;
  background: #fff;
}

.purchase-meta__item span {
  display: block;
  margin-bottom: 12px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.purchase-meta__item strong {
  display: block;
  color: var(--sf-ink);
  font-size: 15px;
  line-height: 1.5;
}

.purchase-meta__item.subtle {
  background: #faf7f3;
}

.qty {
  display: inline-grid !important;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  width: 128px;
  overflow: hidden;
}

.qty button {
  min-width: 0;
  width: 100%;
  height: 44px;
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.qty strong {
  text-align: center;
}

.detail-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 24px;
}

.detail-actions :deep(.sf-button) {
  min-height: 52px;
  border-radius: 4px;
  font-weight: 800;
}

.detail-actions .disabled {
  pointer-events: none;
  opacity: 0.55;
}

.social-actions {
  display: flex;
  justify-content: flex-start;
  gap: 24px;
  margin-top: 18px;
}

.social-actions button {
  border: none;
  background: transparent;
  color: #5e4b43;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.tabs {
  margin-top: 72px;
}

.tabs nav {
  display: flex;
  gap: 48px;
  border-bottom: 1px solid var(--sf-line);
}

.tabs nav button {
  border: none;
  background: transparent;
  padding: 20px 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--sf-ink);
  border-bottom: 2px solid transparent;
}

.tabs nav button.active {
  color: var(--sf-primary);
  border-color: var(--sf-primary);
}

.tab-panel {
  margin-top: 36px;
}

.prose p {
  margin: 0;
  line-height: 1.8;
  color: #334155;
}

.variant-list {
  display: grid;
  gap: 12px;
}

.variant-item {
  display: grid;
  gap: 6px;
  padding: 18px 20px;
  border: 1px solid var(--sf-line);
  border-radius: 8px;
  background: #fff;
}

.variant-item span {
  color: var(--sf-primary);
  font-weight: 800;
}

.variant-item small {
  color: var(--sf-muted);
}

.review-layout {
  display: grid;
  grid-template-columns: 330px 1fr;
  gap: 64px;
  margin-top: 52px;
}

.review-summary {
  background: #eaf1fb;
  padding: 36px;
}

.review-summary strong {
  display: block;
  font-size: 58px;
}

.review-summary span {
  color: var(--sf-primary);
}

.review-summary small {
  display: block;
  margin: 12px 0 28px;
  color: var(--sf-muted);
}

.review-summary button {
  width: 100%;
  height: 46px;
  border: 1px solid var(--sf-ink);
  background: transparent;
  font-weight: 800;
}

.review-list {
  display: grid;
  gap: 42px;
}

.review-item {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 18px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: #dce8f7;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #435166;
  font-weight: 900;
}

.review-item header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.review-item strong,
.review-item small {
  display: block;
}

.review-item small,
.review-item time {
  color: var(--sf-muted);
}

.stars {
  display: block;
  color: var(--sf-primary);
  margin: 12px 0;
}

.review-item p,
.review-empty {
  margin: 0;
  color: #293445;
  line-height: 1.8;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 34px;
}

@media (max-width: 1180px) {
  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .gallery-shell {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .purchase-panel {
    position: static;
  }
}

@media (max-width: 950px) {
  .review-layout {
    grid-template-columns: 1fr;
    gap: 34px;
  }

  .benefits,
  .purchase-meta,
  .detail-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .detail-page {
    padding-top: 18px;
  }

  .detail-breadcrumb {
    margin-bottom: 18px;
  }

  .product-head,
  .purchase-meta__item {
    padding: 16px;
  }

  .gallery-shell {
    grid-template-columns: 1fr;
  }

  .thumbs {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: auto;
    gap: 10px;
    order: 2;
  }

  .detail-actions {
    position: sticky;
    bottom: 74px;
    z-index: 30;
    margin: 24px -16px 0;
    padding: 12px 16px;
    background: rgba(245, 247, 251, 0.94);
    backdrop-filter: blur(12px);
  }

  .tabs {
    margin-top: 40px;
  }

  .tabs nav {
    overflow-x: auto;
    gap: 26px;
  }

  .tabs nav button {
    white-space: nowrap;
    font-size: 15px;
  }

  .related-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .social-actions {
    justify-content: flex-start;
  }
}
</style>
