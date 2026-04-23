<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { CalendarDays, MessageSquare, Search } from "lucide-vue-next";
import { storefrontApi } from "@/api/storefront";
import { getStoreDisplayName } from "@/utils/storefront-brand";

type BlogPost = Awaited<ReturnType<typeof storefrontApi.getBlogs>>[number];

const displayStoreName = computed(getStoreDisplayName);
const posts = ref<BlogPost[]>([]);
const apiCategories = ref<string[]>([]);
const activeCategory = ref("Tất cả");
const keyword = ref("");
const loading = ref(false);
const apiError = ref("");

const categories = computed(() => ["Tất cả", ...apiCategories.value.filter(Boolean)]);
const filteredPosts = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  return posts.value.filter((post) => {
    const matchesCategory = activeCategory.value === "Tất cả" || post.category === activeCategory.value;
    const matchesSearch =
      !query ||
      post.title.toLowerCase().includes(query) ||
      post.excerpt.toLowerCase().includes(query) ||
      post.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
});
const featured = computed(() => filteredPosts.value[0] || null);
const blogPosts = computed(() => filteredPosts.value.slice(1));
const latest = computed(() => posts.value.slice(0, 4));

onMounted(async () => {
  loading.value = true;
  apiError.value = "";
  const [postsResult, categoriesResult] = await Promise.allSettled([
    storefrontApi.getBlogs({ limit: 24 }),
    storefrontApi.getBlogCategories(),
  ]);

  if (postsResult.status === "fulfilled") posts.value = postsResult.value;
  if (categoriesResult.status === "fulfilled") apiCategories.value = categoriesResult.value;
  if (postsResult.status === "rejected") apiError.value = "Không tải được blog của shop hiện tại.";
  loading.value = false;
});
</script>

<template>
  <section class="blog-page theme-editorial sf-container">
    <header class="blog-heading">
      <div>
        <small>{{ displayStoreName }}</small>
        <h1>Blog cửa hàng</h1>
        <p>Bài viết public của shop hiện tại, không dùng dữ liệu mẫu khi chạy theo subdomain cửa hàng.</p>
      </div>
      <label class="blog-search">
        <Search :size="18" />
        <input v-model="keyword" placeholder="Tìm kiếm bài viết..." />
      </label>
    </header>

    <nav class="category-tabs">
      <button
        v-for="category in categories"
        :key="category"
        type="button"
        :class="{ active: activeCategory === category }"
        @click="activeCategory = category"
      >
        {{ category }}
      </button>
    </nav>

    <p v-if="loading" class="blog-state">Đang tải blog...</p>
    <p v-else-if="apiError" class="blog-state warning">{{ apiError }}</p>

    <div v-else-if="filteredPosts.length" class="blog-layout">
      <main class="blog-main">
        <RouterLink v-if="featured" :to="`/blog/${featured.slug}`" class="featured-post">
          <img :src="featured.image" :alt="featured.title" />
          <div>
            <span>Nổi bật</span>
            <h2>{{ featured.title }}</h2>
            <p>{{ featured.excerpt }}</p>
            <strong>Đọc thêm</strong>
          </div>
        </RouterLink>

        <section class="post-grid">
          <RouterLink v-for="post in blogPosts" :key="post.slug" :to="`/blog/${post.slug}`" class="post-card">
            <img :src="post.image" :alt="post.title" />
            <span>{{ post.category }}</span>
            <h2>{{ post.title }}</h2>
            <p>{{ post.excerpt }}</p>
            <footer>
              <small><CalendarDays :size="14" /> {{ post.date }}</small>
              <small><MessageSquare :size="14" /> {{ post.comments }}</small>
            </footer>
          </RouterLink>
        </section>
      </main>

      <aside class="blog-sidebar" v-if="latest.length">
        <h2>Bài viết mới nhất</h2>
        <RouterLink v-for="post in latest" :key="post.slug" :to="`/blog/${post.slug}`">
          <img :src="post.image" :alt="post.title" />
          <span>{{ post.title }}<small>{{ post.date }}</small></span>
        </RouterLink>
      </aside>
    </div>

    <section v-else class="blog-empty">
      <h2>Shop này chưa có bài viết</h2>
      <p>Chưa có bài viết nào được xuất bản trong blog của tenant hiện tại.</p>
    </section>
  </section>
</template>

<style scoped>
.blog-page {
  padding-top: 42px;
}

.blog-heading {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.blog-heading small {
  display: inline-block;
  margin-bottom: 8px;
  color: var(--sf-primary);
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.blog-heading h1 {
  margin: 0;
  font-size: clamp(42px, 6vw, 68px);
  line-height: 0.95;
  letter-spacing: -0.07em;
}

.blog-heading p {
  max-width: 680px;
  margin: 14px 0 0;
  color: var(--sf-muted);
  line-height: 1.7;
}

.blog-search {
  width: min(360px, 100%);
  height: 50px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border: 1px solid var(--sf-line);
  border-radius: 999px;
  background: #fff;
}

.blog-search input {
  min-width: 0;
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 32px;
}

.category-tabs button {
  min-height: 40px;
  padding: 0 18px;
  border: 1px solid var(--sf-line);
  border-radius: 999px;
  background: #fff;
  color: var(--sf-ink);
  font-weight: 800;
}

.category-tabs .active {
  border-color: var(--sf-primary);
  background: var(--sf-primary);
  color: #fff;
}

.blog-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 34px;
}

.blog-main {
  display: grid;
  gap: 28px;
}

.featured-post {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  border-radius: 14px;
  overflow: hidden;
  background: #edf4fd;
}

.featured-post img,
.post-card img,
.blog-sidebar img {
  width: 100%;
  object-fit: cover;
}

.featured-post img {
  height: 430px;
}

.featured-post div {
  padding: 36px 30px;
}

.featured-post span,
.post-card span {
  color: var(--sf-primary);
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.featured-post h2 {
  margin: 16px 0;
  font-size: 34px;
  line-height: 1.12;
  letter-spacing: -0.05em;
}

.featured-post p,
.post-card p {
  color: #5c4037;
  line-height: 1.65;
}

.featured-post strong {
  display: inline-flex;
  margin-top: 18px;
  color: var(--sf-primary);
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

.post-card,
.blog-sidebar,
.blog-empty {
  border-radius: 12px;
  background: #fff;
  box-shadow: var(--sf-shadow-soft);
}

.post-card {
  overflow: hidden;
}

.post-card img {
  height: 190px;
}

.post-card span,
.post-card h2,
.post-card p,
.post-card footer {
  margin-left: 18px;
  margin-right: 18px;
}

.post-card h2 {
  margin-top: 10px;
  font-size: 21px;
}

.post-card footer {
  display: flex;
  justify-content: space-between;
  padding: 16px 0 18px;
  border-top: 1px solid var(--sf-line);
  color: #8c817b;
}

.post-card small {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.blog-sidebar {
  align-self: start;
  padding: 22px;
  background: #edf4fd;
}

.blog-sidebar h2 {
  margin: 0 0 18px;
}

.blog-sidebar a {
  display: grid;
  grid-template-columns: 78px 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.blog-sidebar img {
  height: 58px;
  border-radius: 8px;
}

.blog-sidebar span {
  font-weight: 800;
}

.blog-sidebar small {
  display: block;
  margin-top: 6px;
  color: #667085;
}

.blog-empty,
.blog-state {
  padding: 32px;
  color: var(--sf-muted);
}

.blog-empty h2 {
  margin: 0 0 10px;
  color: var(--sf-ink);
}

.blog-empty p,
.blog-state {
  margin: 0;
  font-weight: 700;
}

.blog-state.warning {
  color: var(--sf-primary);
}

@media (max-width: 1000px) {
  .blog-layout,
  .featured-post {
    grid-template-columns: 1fr;
  }

  .post-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .blog-page {
    padding-top: 24px;
  }

  .blog-heading {
    display: block;
  }

  .blog-search {
    width: 100%;
    margin-top: 18px;
  }

  .category-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  .post-grid {
    grid-template-columns: 1fr;
  }

  .featured-post img,
  .post-card img {
    height: 250px;
  }
}
</style>
