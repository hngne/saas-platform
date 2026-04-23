<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Briefcase, Gem, Home, Search, Shirt } from "lucide-vue-next";
import ProductCard from "@/components/ProductCard.vue";
import { storefrontApi } from "@/api/storefront";
import type { Product } from "@/data/storefront";
import { getStoreDisplayName } from "@/utils/storefront-brand";

const displayStoreName = computed(getStoreDisplayName);
const suggestedProducts = ref<Product[]>([]);

const categories = [
  { icon: Home, label: "Nội thất", to: "/products" },
  { icon: Shirt, label: "Trang phục", to: "/products" },
  { icon: Gem, label: "Phụ kiện", to: "/products" },
  { icon: Briefcase, label: "Tạp chí", to: "/blog" },
];

onMounted(async () => {
  const products = await storefrontApi.getProducts({ limit: 4 }).catch(() => []);
  suggestedProducts.value = products;
});
</script>

<template>
  <section class="not-found-page theme-editorial">
    <main class="not-found-shell">
      <section class="hero-copy">
        <span>404</span>
        <h1>Trang bạn tìm không tồn tại</h1>
        <p>Có thể đường dẫn đã thay đổi, bài viết chưa public hoặc sản phẩm đã được gỡ bỏ khỏi {{ displayStoreName }}.</p>

        <form class="archive-search" role="search">
          <Search :size="20" />
          <input placeholder="Tìm kiếm sản phẩm, bài viết..." />
          <button type="button">Tìm</button>
        </form>

        <div class="actions">
          <RouterLink class="sf-button" to="/">Về trang chủ</RouterLink>
          <RouterLink class="sf-button ghost" to="/products">Khám phá sản phẩm</RouterLink>
        </div>
      </section>

      <section class="category-section">
        <h2>Khám phá danh mục</h2>
        <div>
          <RouterLink v-for="category in categories" :key="category.label" :to="category.to">
            <span><component :is="category.icon" :size="20" /></span>
            {{ category.label }}
          </RouterLink>
        </div>
      </section>

      <section v-if="suggestedProducts.length" class="feature-section">
        <div class="sf-section-title">
          <h2>Có thể bạn sẽ thích</h2>
          <RouterLink to="/products">Xem tất cả</RouterLink>
        </div>
        <div class="product-grid">
          <ProductCard v-for="product in suggestedProducts" :key="product.id" :product="product" compact />
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
.not-found-page {
  min-height: 100vh;
  background: var(--sf-bg);
  color: var(--sf-ink);
}

.not-found-shell {
  width: min(1180px, calc(100% - 64px));
  margin: 0 auto;
  padding: 90px 0;
}

.hero-copy {
  max-width: 760px;
  margin: 0 auto 70px;
  text-align: center;
}

.hero-copy span {
  display: inline-flex;
  margin-bottom: 22px;
  color: var(--sf-primary);
  font-size: clamp(84px, 16vw, 180px);
  font-weight: 900;
  line-height: 1;
}

.hero-copy h1 {
  margin: 0;
  font-size: clamp(40px, 7vw, 70px);
  line-height: 0.95;
  letter-spacing: -0.07em;
}

.hero-copy p {
  width: min(620px, 100%);
  margin: 24px auto 34px;
  color: #536073;
  line-height: 1.8;
}

.archive-search {
  width: min(620px, 100%);
  min-height: 56px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 0 8px 0 20px;
  border-radius: 999px;
  background: #dce8f7;
  color: #536073;
}

.archive-search input {
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
}

.archive-search button {
  height: 42px;
  min-width: 78px;
  border: none;
  border-radius: 999px;
  background: var(--sf-primary);
  color: #fff;
  font-weight: 900;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
}

.category-section,
.feature-section {
  margin-top: 72px;
}

.category-section h2,
.feature-section h2 {
  margin: 0 0 24px;
  font-size: 28px;
  letter-spacing: -0.03em;
}

.category-section > div {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.category-section a {
  min-height: 150px;
  border-radius: 10px;
  background: #eaf1fb;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 14px;
  font-weight: 800;
}

.category-section span {
  width: 46px;
  height: 46px;
  border-radius: 999px;
  background: #fff;
  color: var(--sf-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
  padding: 24px;
  border-radius: 18px;
  background: #eaf1fb;
}

@media (max-width: 900px) {
  .not-found-shell {
    width: calc(100% - 48px);
    padding: 60px 0 90px;
  }

  .actions {
    display: grid;
  }

  .category-section > div {
    display: flex;
    overflow-x: auto;
  }

  .category-section a {
    flex: 0 0 172px;
    min-height: 70px;
    grid-auto-flow: column;
    place-items: center;
    padding: 0 18px;
  }

  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    padding: 0;
    background: transparent;
  }
}
</style>
