<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeft, Share2 } from "lucide-vue-next";
import { storefrontApi } from "@/api/storefront";
import { getStoreDisplayName } from "@/utils/storefront-brand";

type BlogPost = Awaited<ReturnType<typeof storefrontApi.getBlog>>;

const route = useRoute();
const displayStoreName = computed(getStoreDisplayName);
const post = ref<BlogPost | null>(null);
const loading = ref(false);
const errorMessage = ref("");

const paragraphs = computed(() => {
  const content = post.value?.content?.trim();
  if (!content) return [];
  return content
    .split(/\n{2,}|\r\n\r\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
});

watch(
  () => route.params.slug,
  async (slug) => {
    loading.value = true;
    errorMessage.value = "";
    try {
      post.value = await storefrontApi.getBlog(String(slug));
    } catch {
      post.value = null;
      errorMessage.value = "Không tìm thấy bài viết trong shop hiện tại.";
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <article v-if="post" class="article-page theme-editorial sf-container">
    <nav class="article-actions">
      <RouterLink to="/blog"><ArrowLeft :size="18" /> Quay lại blog</RouterLink>
      <button type="button"><Share2 :size="18" /> Chia sẻ</button>
    </nav>

    <img class="hero" :src="post.image" :alt="post.title" />

    <main class="article-body">
      <section class="article-head">
        <p><span>{{ post.category }}</span> · {{ post.date }}</p>
        <h1>{{ post.title }}</h1>
        <div class="author">
          <div class="author-badge">{{ displayStoreName.charAt(0) }}</div>
          <span><strong>{{ displayStoreName }}</strong>Bài viết public của cửa hàng</span>
        </div>
      </section>

      <template v-if="paragraphs.length">
        <p v-for="paragraph in paragraphs" :key="paragraph">{{ paragraph }}</p>
      </template>
      <p v-else>{{ post.excerpt || "Nội dung bài viết đang được cập nhật." }}</p>

      <nav class="tags">
        <span>#{{ post.category.replace(/\s+/g, "") }}</span>
        <span>#Storefront</span>
        <span>#{{ displayStoreName.replace(/\s+/g, "") }}</span>
      </nav>
    </main>
  </article>

  <section v-else class="article-empty theme-editorial sf-container">
    <RouterLink to="/blog"><ArrowLeft :size="18" /> Quay lại blog</RouterLink>
    <h1>{{ loading ? "Đang tải bài viết..." : "Không tìm thấy bài viết" }}</h1>
    <p>{{ errorMessage || "Bài viết này không tồn tại hoặc chưa được xuất bản trong shop hiện tại." }}</p>
    <RouterLink class="sf-button" to="/blog">Quay lại blog</RouterLink>
  </section>
</template>

<style scoped>
.article-page,
.article-empty {
  padding-top: 36px;
}

.article-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
}

.article-actions a,
.article-actions button {
  border: none;
  background: transparent;
  color: var(--sf-primary);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
}

.hero {
  width: 100%;
  max-height: 520px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: var(--sf-shadow-soft);
}

.article-body {
  width: min(820px, 100%);
  margin: 0 auto;
  padding: 36px 0 20px;
}

.article-head p {
  margin: 0 0 12px;
  color: #667085;
}

.article-head span {
  color: var(--sf-primary);
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 18px;
  font-size: clamp(38px, 6vw, 64px);
  line-height: 1.05;
  letter-spacing: -0.06em;
}

.author {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 0;
  border-top: 1px solid var(--sf-line);
  border-bottom: 1px solid var(--sf-line);
}

.author-badge {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: #dce8f7;
  color: var(--sf-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}

.author strong,
.author span {
  display: block;
}

.author span {
  color: #667085;
  font-size: 13px;
}

.article-body > p {
  color: #3f342f;
  font-size: 17px;
  line-height: 1.9;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 26px;
}

.tags span {
  padding: 6px 10px;
  border-radius: 999px;
  background: #dce8f7;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.article-empty {
  min-height: 50vh;
  text-align: center;
}

.article-empty > a:first-child {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--sf-primary);
  font-weight: 900;
}

.article-empty p {
  color: var(--sf-muted);
  margin-bottom: 28px;
}
</style>
