<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { blogPostService, type BlogPost, type BlogPostFilter, type BlogPostStatus } from '@/services/blog-post.service'
import { blogCategoryService, type BlogCategory } from '@/services/blog-category.service'
import { useAppToast } from '@/composables/useToast'
import { formatDate, formatNumber } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'

const router = useRouter()
const toast = useAppToast()

type PaginationToken = number | 'ellipsis'

const loading = ref(true)
const posts = ref<BlogPost[]>([])
const totalRecords = ref(0)
const categories = ref<BlogCategory[]>([])
const showDeleteConfirm = ref(false)
const deleteTarget = ref<BlogPost | null>(null)
const filter = ref<BlogPostFilter>({
  page: 1,
  limit: 8,
  search: '',
})

const totalPages = computed(() => {
  const limit = Number(filter.value.limit || 1)
  return Math.max(1, Math.ceil(totalRecords.value / limit))
})

const paginationItems = computed<PaginationToken[]>(() => {
  const total = totalPages.value
  const current = Number(filter.value.page || 1)
  if (total <= 1) return [1]

  const candidates = new Set<number>([1, total, current - 1, current, current + 1])
  const pages = [...candidates].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)
  const items: PaginationToken[] = []

  pages.forEach((page, index) => {
    const previous = pages[index - 1] ?? page
    if (index > 0 && page - previous > 1) items.push('ellipsis')
    items.push(page)
  })

  return items
})

const summary = computed(() => ({
  total: totalRecords.value,
  published: posts.value.filter((post) => post.status === 'PUBLISHED').length,
  draft: posts.value.filter((post) => post.status === 'DRAFT').length,
}))

const categoryOptions = computed(() => [
  { label: 'Tất cả danh mục', value: undefined },
  ...categories.value.map((category) => ({
    label: category.name,
    value: category.id,
  })),
])

const statusOptions = [
  { label: 'Tất cả trạng thái', value: undefined },
  { label: 'Nháp', value: 'DRAFT' as BlogPostStatus },
  { label: 'Xuất bản', value: 'PUBLISHED' as BlogPostStatus },
]

const fetchData = async () => {
  loading.value = true
  try {
    const [{ data: postData }, { data: categoryData }] = await Promise.all([
      blogPostService.getAll(filter.value),
      blogCategoryService.getAll(),
    ])
    const payload = postData.data || {}
    posts.value = payload.data || payload.items || payload || []
    totalRecords.value = Number(payload.meta?.total ?? payload.total ?? posts.value.length)
    categories.value = categoryData.data || []
  } catch {
    toast.error('Không thể tải danh sách bài viết blog')
  } finally {
    loading.value = false
  }
}

const openCreate = () => router.push('/blog/posts/new')
const openEdit = (postId: string) => router.push(`/blog/posts/${postId}/edit`)

const toggleStatus = async (post: BlogPost) => {
  try {
    await blogPostService.update(post.id, {
      status: post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
    })
    toast.success(post.status === 'PUBLISHED' ? 'Đã chuyển bài viết về nháp' : 'Đã xuất bản bài viết')
    await fetchData()
  } catch (error: any) {
    toast.error('Lỗi', error?.response?.data?.message || 'Không thể cập nhật trạng thái bài viết')
  }
}

const confirmDelete = (post: BlogPost) => {
  deleteTarget.value = post
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return

  try {
    await blogPostService.delete(deleteTarget.value.id)
    toast.success('Đã xóa bài viết blog')
    await fetchData()
  } catch (error: any) {
    toast.error('Lỗi', error?.response?.data?.message || 'Không thể xóa bài viết blog')
  }
}

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === filter.value.page) return
  filter.value.page = page
  fetchData()
}

watch(
  () => [filter.value.blog_category_id, filter.value.status],
  () => {
    filter.value.page = 1
    fetchData()
  },
)

onMounted(fetchData)
</script>

<template>
  <div class="blog-post-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">Bài viết blog</h1>
        <p class="page-subtitle">
          Quản lý danh sách bài viết, trạng thái xuất bản và nội dung blog dành cho merchant.
        </p>
      </div>

      <Button
        label="Thêm bài viết"
        icon="pi pi-plus"
        class="btn-create-unified"
        @click="openCreate"
      />
    </section>

    <section class="stats-grid">
      <article class="stat-card">
        <p class="stat-label">Tổng bài viết</p>
        <strong class="stat-value">{{ formatNumber(summary.total) }}</strong>
        <p class="stat-note">Tổng số bản ghi đang có trong CMS</p>
      </article>

      <article class="stat-card">
        <p class="stat-label">Đã xuất bản</p>
        <strong class="stat-value">{{ formatNumber(summary.published) }}</strong>
        <p class="stat-note">Bài viết đang hiển thị ra bên ngoài</p>
      </article>

      <article class="stat-card">
        <p class="stat-label">Nháp</p>
        <strong class="stat-value">{{ formatNumber(summary.draft) }}</strong>
        <p class="stat-note">Nội dung đang ở chế độ chỉnh sửa</p>
      </article>
    </section>

    <section class="content-shell">
      <div class="toolbar-top">
        <div class="search-wrap">
          <i class="pi pi-search search-icon"></i>
          <InputText
            v-model="filter.search"
            class="search-input"
            placeholder="Tìm tiêu đề bài viết..."
            @keyup.enter="fetchData"
          />
        </div>

        <div class="select-group">
          <Select
            v-model="filter.blog_category_id"
            :options="categoryOptions"
            optionLabel="label"
            optionValue="value"
            class="toolbar-select"
          />
          <Select
            v-model="filter.status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            class="toolbar-select"
          />
        </div>
      </div>

      <div class="table-card">
        <div class="table-head">
          <div>Tiêu đề</div>
          <div>Danh mục</div>
          <div>Tags</div>
          <div>Trạng thái</div>
          <div>Ngày tạo</div>
          <div class="text-right">Thao tác</div>
        </div>

        <div v-if="loading" class="table-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <div v-else-if="!posts.length" class="empty-wrap">
          <EmptyState
            icon="pi pi-file-edit"
            title="Chưa có bài viết blog"
            description="Tạo bài viết đầu tiên để quản lý nội dung blog trực tiếp trong merchant CMS."
          >
            <div class="empty-actions">
              <Button label="Tạo bài viết" icon="pi pi-plus" class="btn-create-unified" @click="openCreate" />
            </div>
          </EmptyState>
        </div>

        <template v-else>
          <div
            v-for="post in posts"
            :key="post.id"
            class="post-row"
          >
            <div class="title-cell">
              <span class="mobile-label">Tiêu đề</span>
              <strong>{{ post.title }}</strong>
              <span>{{ post.slug }}</span>
            </div>

            <div class="category-cell">
              <span class="mobile-label">Danh mục</span>
              <strong>{{ post.category?.name || 'Không gắn danh mục' }}</strong>
            </div>

            <div class="tags-cell">
              <span class="mobile-label">Tags</span>
              <div class="tag-wrap">
                <span v-for="tag in post.tags.slice(0, 3)" :key="tag.id || tag.tag" class="tag-chip">{{ tag.tag }}</span>
                <span v-if="post.tags.length > 3" class="tag-chip muted">+{{ post.tags.length - 3 }}</span>
              </div>
            </div>

            <div class="status-cell">
              <span class="mobile-label">Trạng thái</span>
              <button
                type="button"
                class="status-pill"
                :class="post.status === 'PUBLISHED' ? 'status-active' : 'status-draft'"
                @click="toggleStatus(post)"
              >
                {{ post.status === 'PUBLISHED' ? 'Xuất bản' : 'Nháp' }}
              </button>
            </div>

            <div class="date-cell">
              <span class="mobile-label">Ngày tạo</span>
              <strong>{{ formatDate(post.created_at) }}</strong>
            </div>

            <div class="actions-cell">
              <button type="button" class="row-action" @click="openEdit(post.id)">Sửa</button>
              <button type="button" class="row-action danger" @click="confirmDelete(post)">Xóa</button>
            </div>
          </div>
        </template>
      </div>

      <div class="table-footer" v-if="totalPages > 1">
        <div class="pagination-wrap">
          <button class="page-nav" :disabled="filter.page === 1" @click="goToPage(Number(filter.page) - 1)">
            <i class="pi pi-angle-left"></i>
          </button>

          <button
            v-for="item in paginationItems"
            :key="`${item}-${filter.page}`"
            class="page-btn"
            :class="{ active: item === filter.page, ghost: item === 'ellipsis' }"
            :disabled="item === 'ellipsis'"
            @click="typeof item === 'number' && goToPage(item)"
          >
            {{ item === 'ellipsis' ? '…' : item }}
          </button>

          <button class="page-nav" :disabled="filter.page === totalPages" @click="goToPage(Number(filter.page) + 1)">
            <i class="pi pi-angle-right"></i>
          </button>
        </div>
      </div>
    </section>

    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      message="Xóa bài viết blog này khỏi hệ thống?"
      severity="danger"
      confirmLabel="Xóa"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.blog-post-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.content-shell {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 249, 245, 0.92));
  border: 1px solid #edf2f7;
  border-radius: 28px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.04);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.stat-card {
  min-height: 148px;
  padding: 24px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.9));
  border: 1px solid #edf2f7;
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.04);
}

.stat-label {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a6f63;
}

.stat-value {
  display: block;
  margin-top: 16px;
  font-size: clamp(2rem, 4vw, 2.4rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 1;
  color: #0f172a;
}

.stat-note {
  margin-top: 14px;
  color: #64748b;
  line-height: 1.65;
}

.content-shell {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toolbar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.search-wrap {
  position: relative;
  flex: 1;
  max-width: 420px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}

.search-input {
  width: 100%;
  height: 52px;
  padding-left: 44px;
  border-radius: 18px;
  border-color: #e2e8f0;
  background: #f8fbff;
}

.select-group {
  display: flex;
  gap: 12px;
}

.toolbar-select {
  min-width: 180px;
}

.table-card {
  border-radius: 26px;
  background: #fff;
  border: 1px solid #edf2f7;
  overflow: hidden;
}

.table-head,
.post-row {
  display: grid;
  grid-template-columns: 1.8fr 1fr 1.2fr 1fr 1fr 0.9fr;
  gap: 18px;
}

.table-head {
  padding: 18px 24px;
  background: #f8fbff;
  border-bottom: 1px solid #edf2f7;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #94a3b8;
}

.post-row {
  padding: 24px;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
}

.post-row:last-child {
  border-bottom: none;
}

.title-cell,
.category-cell,
.tags-cell,
.status-cell,
.date-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title-cell strong,
.category-cell strong,
.date-cell strong {
  color: #0f172a;
  font-size: 0.98rem;
}

.title-cell span,
.category-cell span {
  color: #64748b;
  line-height: 1.55;
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  min-height: 30px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.tag-chip.muted {
  background: #f1f5f9;
  color: #64748b;
}

.status-pill {
  width: fit-content;
  min-height: 34px;
  padding: 6px 12px;
  border: none;
  border-radius: 999px;
  font-weight: 800;
}

.status-active {
  background: #dcfce7;
  color: #15803d;
}

.status-draft {
  background: #e2e8f0;
  color: #475569;
}

.actions-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.row-action {
  border: none;
  background: transparent;
  color: #111827;
  font-weight: 700;
}

.row-action:hover {
  color: var(--primary);
}

.row-action.danger:hover {
  color: #dc2626;
}

.table-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: var(--primary);
  font-size: 1.4rem;
}

.empty-wrap {
  padding: 32px 24px;
}

.empty-actions {
  margin-top: 14px;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
}

.pagination-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-nav,
.page-btn {
  width: 42px;
  height: 42px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.page-btn.active {
  border-color: transparent;
  background: linear-gradient(135deg, #ff7a31, #ffb11f);
  color: #fff;
}

.page-btn.ghost {
  cursor: default;
}

.mobile-label {
  display: none;
}

@media (max-width: 1080px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .table-head {
    display: none;
  }

  .post-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px 20px;
  }

  .mobile-label {
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .actions-cell {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
  }
}

@media (max-width: 900px) {
  .toolbar-top {
    flex-direction: column;
    align-items: stretch;
  }

  .select-group {
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  .post-row {
    grid-template-columns: 1fr;
  }
}
</style>
