<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Clock3, MapPin, ShieldCheck, Truck } from "lucide-vue-next";
import CategoryTile from "@/components/CategoryTile.vue";
import ProductCard from "@/components/ProductCard.vue";
import { checkoutApi } from "@/api/customer";
import { storefrontApi } from "@/api/storefront";
import { isMockFallbackEnabled } from "@/api/http";
import {
  categories as fallbackCategories,
  posts as fallbackPosts,
  products as fallbackProducts,
  type Category,
  type Product,
} from "@/data/storefront";
import { useShopStore } from "@/stores/shop.store";

const shopStore = useShopStore();
const router = useRouter();

const apiProducts = ref<Product[]>([]);
const apiCategories = ref<Category[]>([]);
const apiPosts = ref<typeof fallbackPosts>([]);
const apiStores = ref<Array<{ id: string; name: string; address: string }>>([]);
const apiError = ref("");
const useMockFallback = isMockFallbackEnabled();
const placeholderImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1400' height='900' viewBox='0 0 1400 900'%3E%3Crect width='1400' height='900' fill='%23e8eef7'/%3E%3Cg fill='none' stroke='%23b3c1d6' stroke-width='26'%3E%3Crect x='210' y='150' width='980' height='600' rx='42'/%3E%3Cpath d='M300 650l210-220 160 140 210-260 245 340'/%3E%3Ccircle cx='480' cy='330' r='58'/%3E%3C/g%3E%3C/svg%3E";

const displayStoreName = computed(() => shopStore.getStoreName());
const products = computed(() =>
  apiProducts.value.length ? apiProducts.value : useMockFallback ? fallbackProducts : [],
);
const categories = computed(() =>
  apiCategories.value.length ? apiCategories.value : useMockFallback ? fallbackCategories : [],
);
const posts = computed(() =>
  apiPosts.value.length ? apiPosts.value.slice(0, 3) : useMockFallback ? fallbackPosts : [],
);
const bestSellers = computed(() => products.value.slice(0, 4));
const newArrivals = computed(() => products.value.slice(4, 8));
const heroProduct = computed(() => products.value[0] || null);
const heroCategories = computed(() =>
  categories.value.slice(0, 2).map((category) => category.name),
);
const featuredStory = computed(() => posts.value[0] || null);
const pickupCount = computed(() => apiStores.value.length);

const banners = computed(() => shopStore.getBanners());
const activeBannerIndex = ref(0);
let bannerTimer: ReturnType<typeof setInterval> | undefined;
const hasCustomBanner = computed(() => banners.value.length > 0);

const nextBanner = () => {
  if (!banners.value.length) return;
  activeBannerIndex.value = (activeBannerIndex.value + 1) % banners.value.length;
};

const stopBannerSlider = () => {
  if (!bannerTimer) return;
  clearInterval(bannerTimer);
  bannerTimer = undefined;
};

const startBannerSlider = () => {
  stopBannerSlider();
  if (banners.value.length > 1) {
    bannerTimer = setInterval(nextBanner, 5000);
  }
};

watch(
  banners,
  (items) => {
    if (activeBannerIndex.value >= items.length) activeBannerIndex.value = 0;
    startBannerSlider();
  },
  { immediate: true },
);

onBeforeUnmount(stopBannerSlider);

const openBanner = (href: string) => {
  const target = href.trim();
  if (!target) return;

  if (/^https?:\/\//i.test(target)) {
    window.location.href = target;
    return;
  }

  router.push(target.startsWith("/") ? target : `/${target}`);
};
const getPostSummary = (post: { excerpt?: string } | null | undefined) =>
  post?.excerpt || "Cập nhật mới nhất từ cửa hàng.";

const heroTitle = computed(() => {
  if (heroCategories.value.length >= 2) {
    return `${displayStoreName.value}\n${heroCategories.value[0]} & ${heroCategories.value[1]}`;
  }
  if (heroCategories.value[0]) {
    return `${displayStoreName.value}\n${heroCategories.value[0]}`;
  }
  return displayStoreName.value;
});

const heroDescription = computed(() => {
  if (heroProduct.value?.description) return heroProduct.value.description;
  if (featuredStory.value) return getPostSummary(featuredStory.value as { excerpt?: string });
  return "Không gian của shop sẽ hiển thị sản phẩm, bài viết và điểm nhận hàng thật từ backend, sẵn sàng để nối tiếp với CMS về sau.";
});

const promoTitle = computed(() => {
  if (heroProduct.value?.name) return heroProduct.value.name;
  return "Bộ sưu tập nổi bật";
});

const promoDescription = computed(() => {
  const categoryCount = categories.value.length;
  const productCount = products.value.length;
  if (!categoryCount && !productCount) return "Shop này chưa có dữ liệu public để hiển thị.";
  return `${productCount} sản phẩm đang mở bán trong ${categoryCount} danh mục public.`;
});

onMounted(async () => {
  const [productResult, categoryResult, blogResult, storeResult] = await Promise.allSettled([
    storefrontApi.getProducts({ limit: 8 }),
    storefrontApi.getCategories(),
    storefrontApi.getBlogs({ limit: 3 }),
    checkoutApi.getStores(),
  ]);

  if (productResult.status === "fulfilled") apiProducts.value = productResult.value;
  if (categoryResult.status === "fulfilled") apiCategories.value = categoryResult.value;
  if (blogResult.status === "fulfilled") apiPosts.value = blogResult.value;
  if (storeResult.status === "fulfilled") apiStores.value = storeResult.value;

  if (
    productResult.status === "rejected" ||
    categoryResult.status === "rejected" ||
    blogResult.status === "rejected" ||
    storeResult.status === "rejected"
  ) {
    apiError.value =
      "Không tải được dữ liệu cửa hàng. Kiểm tra tenant slug, backend và các module public trong shop.";
  }
});
</script>

<template>
  <section class="hero" :class="{ 'hero--clean-banner': hasCustomBanner }">
    <div class="hero-media">
      <template v-if="banners.length">
        <button
          v-for="(banner, idx) in banners"
          :key="idx"
          class="hero-banner-item"
          :class="{ active: idx === activeBannerIndex, clickable: !!banner.href }"
          type="button"
          :aria-label="banner.href ? `Mở banner ${idx + 1}` : `Banner ${idx + 1}`"
          @click="openBanner(banner.href)"
        >
          <img :src="banner.image" :alt="displayStoreName" />
        </button>
        <div v-if="banners.length > 1" class="hero-dots">
          <button
            v-for="(_, idx) in banners"
            :key="idx"
            class="dot"
            :class="{ active: idx === activeBannerIndex }"
            @click="activeBannerIndex = idx"
          ></button>
        </div>
      </template>
      <img
        v-else
        :src="heroProduct?.image || featuredStory?.image || placeholderImage"
        :alt="heroProduct?.name || displayStoreName"
      />
    </div>
    <div v-if="!hasCustomBanner" class="sf-container hero-copy">
      <p class="sf-kicker">Storefront live data</p>
      <h1>{{ heroTitle }}</h1>
      <p>{{ heroDescription }}</p>
      <div class="hero-actions">
        <RouterLink class="sf-button" to="/products">Mua ngay</RouterLink>
        <RouterLink class="sf-button ghost" to="/blog">Xem tạp chí</RouterLink>
      </div>
    </div>
  </section>

  <section class="sf-section">
    <div class="sf-container category-grid">
      <CategoryTile
        v-for="category in categories"
        :key="category.slug"
        :category="category"
      />
    </div>
  </section>

  <section v-if="apiError && !products.length && !categories.length" class="sf-section">
    <div class="sf-container storefront-empty">
      <h2>Chưa có dữ liệu cửa hàng</h2>
      <p>{{ apiError }}</p>
    </div>
  </section>

  <section class="sf-section products-band">
    <div class="sf-container">
      <div class="sf-section-title">
        <h2>Sản phẩm bán chạy</h2>
        <RouterLink to="/products">Xem tất cả</RouterLink>
      </div>
      <div class="product-rail">
        <ProductCard v-for="product in bestSellers" :key="product.id" :product="product" />
      </div>
      <p v-if="!bestSellers.length" class="empty-note">
        Shop này chưa có sản phẩm đang hiển thị.
      </p>
    </div>
  </section>

  <section class="promo sf-container">
    <div class="promo-copy">
      <p class="sf-kicker">Nội dung có thể thay bằng CMS sau này</p>
      <h2>{{ promoTitle }}</h2>
      <p>{{ promoDescription }}</p>
      <div class="stats">
        <span>{{ products.length }} sản phẩm</span>
        <span>{{ categories.length }} danh mục</span>
        <span>{{ pickupCount }} điểm nhận hàng</span>
      </div>
    </div>
    <img
      :src="newArrivals[0]?.image || heroProduct?.image || placeholderImage"
      :alt="promoTitle"
    />
  </section>

  <section class="sf-section">
    <div class="sf-container">
      <div class="sf-section-title">
        <h2>Hàng mới về</h2>
        <RouterLink to="/products?sort=new">Xem thêm</RouterLink>
      </div>
      <div class="new-grid">
        <ProductCard
          v-for="product in newArrivals"
          :key="product.id"
          :product="product"
          compact
        />
      </div>
      <p v-if="!newArrivals.length" class="empty-note">Chưa có hàng mới từ shop này.</p>
    </div>
  </section>

  <section class="service-band">
    <div class="sf-container service-inner">
      <div class="service-copy">
        <h2>Mua sắm thật. Nhận hàng linh hoạt.</h2>
        <ul>
          <li>
            <span><Truck :size="18" /></span>
            <div>
              <strong>Phương thức giao hàng từ backend</strong>
              <small>Trang checkout sẽ đọc trực tiếp shipping methods public.</small>
            </div>
          </li>
          <li>
            <span><ShieldCheck :size="18" /></span>
            <div>
              <strong>Dữ liệu sản phẩm thật</strong>
              <small>Home đang lấy sản phẩm, danh mục và blog của tenant hiện tại.</small>
            </div>
          </li>
          <li>
            <span><MapPin :size="18" /></span>
            <div>
              <strong>Store pickup sẵn sàng</strong>
              <small>{{ pickupCount || 0 }} điểm nhận hàng đang public trên storefront.</small>
            </div>
          </li>
        </ul>
        <RouterLink class="sf-button ghost" to="/stores">Xem cửa hàng gần bạn</RouterLink>
      </div>
      <div class="service-photo">
        <img
          :src="featuredStory?.image || heroProduct?.image || placeholderImage"
          :alt="displayStoreName"
        />
        <span><Clock3 :size="15" /> {{ pickupCount || 0 }} điểm nhận hàng đang hoạt động</span>
      </div>
    </div>
  </section>

  <section class="sf-section journal">
    <div class="sf-container">
      <div class="journal-title">
        <h2>Tin tức và xu hướng</h2>
        <p>Bài viết được xuất bản từ blog public của tenant hiện tại.</p>
      </div>
      <div class="post-grid">
        <article v-for="post in posts" :key="post.title" class="post-card">
          <img :src="post.image" :alt="post.title" />
          <div>
            <span>{{ post.category }}</span>
            <h3>{{ post.title }}</h3>
            <p>{{ getPostSummary(post as { excerpt?: string }) }}</p>
          </div>
        </article>
      </div>
      <p v-if="!posts.length" class="empty-note center">
        Shop này chưa có bài viết blog được xuất bản.
      </p>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 620px;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: #dfe4df;
}

.hero-media {
  position: absolute;
  inset: 0;
}

.hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-banner-item {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  opacity: 0;
  transition: opacity 1.2s ease-in-out;
}

.hero-banner-item.clickable {
  cursor: pointer;
}

.hero-banner-item.active {
  opacity: 1;
}

.hero-dots {
  position: absolute;
  bottom: 30px;
  right: 50px;
  display: flex;
  gap: 10px;
  z-index: 5;
}

.hero-dots .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: transparent;
  cursor: pointer;
  padding: 0;
  transition: all 0.3s;
}

.hero-dots .dot.active {
  background: #fff;
  transform: scale(1.2);
}

.hero:not(.hero--clean-banner) .hero-media::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(245, 247, 251, 0.94),
    rgba(245, 247, 251, 0.58) 42%,
    rgba(245, 247, 251, 0.08)
  );
}

.hero--clean-banner {
  min-height: min(33.333vw, 620px);
  background: #fff;
}

.hero--clean-banner .hero-banner-item.active {
  opacity: 1 !important;
}

.hero--clean-banner .hero-media img {
  opacity: 1 !important;
  filter: none !important;
  mix-blend-mode: normal !important;
}

.hero-copy {
  position: relative;
  z-index: 1;
}

.hero-copy h1 {
  width: min(700px, 100%);
  margin: 0;
  white-space: pre-line;
  font-size: clamp(42px, 7vw, 78px);
  line-height: 0.95;
  letter-spacing: -0.07em;
}

.hero-copy p:not(.sf-kicker) {
  width: min(560px, 100%);
  margin: 22px 0 0;
  color: #2c3648;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 14px;
  margin-top: 28px;
}

.category-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.75fr 0.75fr;
  gap: 16px;
}

.products-band {
  background: #eef3fb;
}

.product-rail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
}

.promo {
  min-height: 260px;
  margin-top: 72px;
  border-radius: var(--sf-radius-sm);
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--sf-dark);
  color: #fff;
}

.promo-copy {
  padding: 48px;
}

.promo h2 {
  margin: 0;
  font-size: clamp(34px, 4vw, 54px);
  letter-spacing: -0.05em;
}

.promo p:not(.sf-kicker) {
  color: #cbd5e1;
  margin: 12px 0 0;
}

.promo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.stats span {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  display: inline-flex;
  align-items: center;
  font-weight: 800;
}

.new-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 28px;
}

.service-band {
  background: var(--sf-dark);
  color: #fff;
  padding: 72px 0;
}

.service-inner {
  display: grid;
  grid-template-columns: 0.9fr 1fr;
  align-items: center;
  gap: 56px;
}

.service-copy h2 {
  margin: 0;
  font-size: clamp(34px, 5vw, 58px);
  line-height: 0.98;
  letter-spacing: -0.06em;
}

.service-copy ul {
  list-style: none;
  padding: 0;
  margin: 28px 0;
  display: grid;
  gap: 18px;
}

.service-copy li {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.service-copy li > span {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--sf-primary);
}

.service-copy strong,
.service-copy small {
  display: block;
}

.service-copy small {
  margin-top: 3px;
  color: #aeb9c8;
}

.service-photo {
  position: relative;
  min-height: 420px;
  border-radius: var(--sf-radius-sm);
  overflow: hidden;
}

.service-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.service-photo span {
  position: absolute;
  left: 24px;
  bottom: 24px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--sf-primary);
  font-weight: 900;
}

.journal-title {
  text-align: center;
  margin-bottom: 30px;
}

.journal-title h2 {
  margin: 0;
  font-size: 30px;
  letter-spacing: -0.04em;
}

.journal-title p {
  margin: 8px 0 0;
  color: var(--sf-muted);
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
}

.post-card {
  background: #fff;
  border-radius: var(--sf-radius-sm);
  overflow: hidden;
}

.post-card img {
  width: 100%;
  aspect-ratio: 1.55;
  object-fit: cover;
}

.post-card div {
  padding: 18px 0 0;
}

.post-card span {
  color: var(--sf-primary);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.post-card h3 {
  margin: 7px 0;
  font-size: 20px;
  letter-spacing: -0.02em;
}

.post-card p {
  margin: 0;
  color: var(--sf-muted);
  line-height: 1.6;
}

.storefront-empty {
  padding: 34px;
  border-radius: var(--sf-radius-md);
  background: #fff;
  box-shadow: var(--sf-shadow-soft);
}

.storefront-empty h2 {
  margin: 0 0 8px;
}

.storefront-empty p,
.empty-note {
  margin: 18px 0 0;
  color: var(--sf-muted);
  font-weight: 700;
}

.empty-note.center {
  text-align: center;
}

@media (max-width: 900px) {
  .product-rail,
  .new-grid,
  .post-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .service-inner,
  .promo {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero {
    min-height: 560px;
    align-items: end;
    padding-bottom: 46px;
  }

  .hero--clean-banner {
    min-height: 44vw;
    padding-bottom: 0;
   }

  .hero:not(.hero--clean-banner) .hero-media::after {
    background: linear-gradient(
      180deg,
      rgba(245, 247, 251, 0.15),
      rgba(245, 247, 251, 0.94) 78%
    );
  }

  .hero-copy h1 {
    font-size: 46px;
  }

  .category-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .product-rail {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 8px;
  }

  .product-rail :deep(.product-card) {
    width: 78vw;
    flex: 0 0 78vw;
    scroll-snap-align: start;
  }

  .new-grid {
    gap: 16px;
  }

  .promo {
    margin-top: 36px;
  }

  .promo-copy {
    padding: 30px 22px;
  }

  .service-band {
    padding: 48px 0;
  }

  .service-photo {
    min-height: 280px;
  }

  .post-grid {
    grid-template-columns: 1fr;
  }
}
</style>
