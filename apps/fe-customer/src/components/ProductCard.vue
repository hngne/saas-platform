<script setup lang="ts">
import { Heart, Plus, ShoppingCart, Star } from "lucide-vue-next";
import type { Product } from "@/data/storefront";
import { formatVnd } from "@/data/storefront";
import { useCartStore } from "@/stores/cart.store";

defineProps<{
  product: Product;
  compact?: boolean;
}>();

const cart = useCartStore();
</script>

<template>
  <article class="product-card" :class="{ compact }">
    <RouterLink :to="`/products/${product.slug}`" class="product-image">
      <img :src="product.image" :alt="product.name" />
      <span v-if="product.badge" class="product-badge">{{ product.badge }}</span>
      <button class="wishlist" type="button" aria-label="Thêm vào yêu thích">
        <Heart :size="18" />
      </button>
    </RouterLink>

    <div class="product-info">
      <div class="product-meta">
        <span>{{ product.categoryLabel }}</span>
        <span v-if="product.ratingCount > 0" class="rating">
          <Star :size="14" fill="currentColor" />
          {{ product.rating.toFixed(1) }}
          <small v-if="!compact">({{ product.ratingCount }})</small>
        </span>
        <span v-else class="rating empty-rating">Chưa có đánh giá</span>
      </div>

      <RouterLink :to="`/products/${product.slug}`" class="product-name">
        {{ product.name }}
      </RouterLink>

      <div v-if="product.swatches?.length" class="swatches" aria-label="Màu sắc">
        <span
          v-for="swatch in product.swatches.slice(0, 4)"
          :key="`${product.id}-${swatch.label}`"
          :style="swatch.value.startsWith('#') ? { background: swatch.value } : undefined"
          :title="swatch.label"
          :class="{ text: !swatch.value.startsWith('#') }"
        >
          <template v-if="!swatch.value.startsWith('#')">{{ swatch.label.slice(0, 1) }}</template>
        </span>
      </div>

      <div class="product-bottom">
        <div class="price-stack">
          <strong>{{ formatVnd(product.price) }}</strong>
          <del v-if="product.oldPrice">{{ formatVnd(product.oldPrice) }}</del>
        </div>
        <button
          class="add-button"
          type="button"
          :disabled="!product.inStock"
          aria-label="Thêm vào giỏ"
          @click="cart.addProduct(product)"
        >
          <ShoppingCart v-if="!compact" :size="15" />
          <Plus v-else :size="18" />
          <span v-if="!compact">{{ product.inStock ? "Thêm vào giỏ" : "Hết hàng" }}</span>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product-card {
  background: var(--sf-surface);
  border: 1px solid var(--sf-line);
  border-radius: var(--sf-radius-md);
  overflow: hidden;
  box-shadow: var(--sf-shadow-soft);
  min-width: 0;
}

.product-image {
  position: relative;
  display: block;
  aspect-ratio: 1 / 0.86;
  overflow: hidden;
  background: #dfe8f4;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.product-card:hover .product-image img {
  transform: scale(1.04);
}

.product-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #bd1f24;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
}

.wishlist {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #6b3a2a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.product-info {
  padding: 18px;
}

.product-meta,
.product-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.product-meta {
  color: var(--sf-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.rating {
  color: var(--sf-primary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-transform: none;
  letter-spacing: 0;
  white-space: nowrap;
}

.empty-rating {
  color: var(--sf-muted);
}

.product-name {
  display: block;
  min-height: 46px;
  margin: 10px 0 12px;
  color: var(--sf-ink);
  font-size: 18px;
  line-height: 1.25;
  font-weight: 900;
  letter-spacing: 0.01em;
}

.swatches {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.swatches span {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.swatches span.text {
  background: #eef2f7;
  color: #475569;
  font-size: 10px;
  font-weight: 800;
}

.price-stack {
  min-width: 0;
}

.price-stack strong {
  display: block;
  color: var(--sf-primary);
  font-size: 20px;
  line-height: 1.1;
  white-space: nowrap;
}

.price-stack del {
  display: block;
  margin-top: 4px;
  color: var(--sf-muted);
  font-size: 13px;
}

.add-button {
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--sf-line);
  border-radius: 8px;
  background: #fff;
  color: var(--sf-ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.add-button:hover {
  border-color: var(--sf-primary);
  color: var(--sf-primary);
  background: var(--sf-primary-soft);
}

.add-button:disabled {
  cursor: not-allowed;
  color: var(--sf-subtle);
  background: #f3f5f8;
}

.product-card.compact {
  border: none;
  box-shadow: none;
}

.compact .product-info {
  padding: 14px 0 0;
}

.compact .product-name {
  min-height: 42px;
  font-size: 16px;
}

.compact .product-bottom {
  align-items: end;
}

.compact .add-button {
  width: 38px;
  min-width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 999px;
  background: #e8f0fb;
}

@media (max-width: 768px) {
  .product-card {
    border-radius: 14px;
  }

  .product-info {
    padding: 12px;
  }

  .product-image {
    aspect-ratio: 1 / 1.12;
  }

  .product-name {
    min-height: 42px;
    font-size: 15px;
  }

  .product-meta {
    font-size: 11px;
    letter-spacing: 0;
    text-transform: none;
  }

  .price-stack strong {
    font-size: 17px;
  }

  .add-button {
    width: 38px;
    min-width: 38px;
    padding: 0;
    border-radius: 999px;
  }

  .add-button span,
  .add-button svg:first-child:not(:only-child) {
    display: none;
  }
}
</style>
