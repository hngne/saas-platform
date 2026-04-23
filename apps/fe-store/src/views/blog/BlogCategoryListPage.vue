<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { blogCategoryService, type BlogCategory } from '@/services/blog-category.service'
import { useAppToast } from '@/composables/useToast'
import { formatNumber } from '@/utils/format'
import BlogCategoryDrawer from '@/components/blog/BlogCategoryDrawer.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'

const toast = useAppToast()

const loading = ref(true)
const categories = ref<BlogCategory[]>([])
const search = ref('')
const showDrawer = ref(false)
const editItem = ref<BlogCategory | null>(null)
const showDeleteConfirm = ref(false)
const deleteTarget = ref<BlogCategory | null>(null)

const filteredCategories = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) return categories.value
  return categories.value.filter((category) => category.name.toLowerCase().includes(keyword))
})

const summary = computed(() => ({
  total: categories.value.length,
  active: categories.value.filter((category) => category.is_active).length,
  withPosts: categories.value.filter((category) => Number(category._count?.posts || 0) > 0).length,
}))

const fetchCategories = async () => {
  loading.value = true
  try {
    const { data } = await blogCategoryService.getAll()
    categories.value = data.data || []
  } catch {
    toast.error('Không thể tải danh mục blog')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editItem.value = null
  showDrawer.value = true
}

const openEdit = (category: BlogCategory) => {
  editItem.value = { ...category }
  showDrawer.value = true
}

const toggleActive = async (category: BlogCategory) => {
  try {
    await blogCategoryService.toggleActive(category.id, !category.is_active)
    toast.success(category.is_active ? 'Đã tắt danh mục blog' : 'Đã bật danh mục blog')
    await fetchCategories()
  } catch (error: any) {
    toast.error('Lỗi', error?.response?.data?.message || 'Không thể cập nhật trạng thái danh mục')
  }
}

const confirmDelete = (category: BlogCategory) => {
  deleteTarget.value = category
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return

  try {
    await blogCategoryService.delete(deleteTarget.value.id)
    toast.success('Đã xóa danh mục blog')
    await fetchCategories()
  } catch (error: any) {
    toast.error('Lỗi', error?.response?.data?.message || 'Không thể xóa danh mục blog')
  }
}

onMounted(fetchCategories)
</script>

<template>
  <div class="blog-category-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">Danh mục blog</h1>
        <p class="page-subtitle">
          Quản lý nhóm nội dung để bài viết blog được phân loại rõ ràng và dễ lọc hơn trong CMS.
        </p>
      </div>

      <Button
        label="Thêm danh mục blog"
        icon="pi pi-plus"
        class="btn-create-unified"
        @click="openCreate"
      />
    </section>

    <section class="stats-grid">
      <article class="stat-card">
        <p class="stat-label">Tổng danh mục</p>
        <strong class="stat-value">{{ formatNumber(summary.total) }}</strong>
        <p class="stat-note">{{ formatNumber(summary.active) }} danh mục đang bật</p>
      </article>

      <article class="stat-card">
        <p class="stat-label">Có bài viết</p>
        <strong class="stat-value">{{ formatNumber(summary.withPosts) }}</strong>
        <p class="stat-note">Danh mục đã phát sinh nội dung blog</p>
      </article>
    </section>

    <section class="content-shell">
      <div class="toolbar-top">
        <div class="search-wrap">
          <i class="pi pi-search search-icon"></i>
          <InputText
            v-model="search"
            class="search-input"
            placeholder="Tìm tên danh mục..."
          />
        </div>
      </div>

      <div v-if="loading" class="table-loading">
        <i class="pi pi-spin pi-spinner"></i>
      </div>

      <div v-else-if="!filteredCategories.length" class="empty-wrap">
        <EmptyState
          icon="pi pi-folder"
          title="Chưa có danh mục blog"
          description="Bạn có thể bắt đầu bằng các nhóm nội dung như Tin tức, Cẩm nang, Khuyến mãi."
        >
          <div class="empty-actions">
            <Button label="Tạo danh mục" icon="pi pi-plus" class="btn-create-unified" @click="openCreate" />
          </div>
        </EmptyState>
      </div>

      <div v-else class="category-grid">
        <article
          v-for="category in filteredCategories"
          :key="category.id"
          class="category-card"
        >
          <div class="card-top">
            <div>
              <p class="card-overline">{{ category.slug }}</p>
              <h3>{{ category.name }}</h3>
            </div>

            <span class="post-count">{{ formatNumber(category._count?.posts || 0) }} bài viết</span>
          </div>

          <div class="card-bottom">
            <div class="status-block">
              <span class="status-pill" :class="category.is_active ? 'status-active' : 'status-inactive'">
                {{ category.is_active ? 'Đang bật' : 'Tạm ẩn' }}
              </span>
              <ToggleSwitch :modelValue="category.is_active" @update:modelValue="toggleActive(category)" />
            </div>

            <div class="actions">
              <button type="button" class="row-action" @click="openEdit(category)">Sửa</button>
              <button type="button" class="row-action danger" @click="confirmDelete(category)">Xóa</button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <BlogCategoryDrawer
      v-model:visible="showDrawer"
      :category="editItem"
      @saved="showDrawer = false; fetchCategories()"
    />
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      message="Xóa danh mục blog này khỏi hệ thống?"
      severity="danger"
      confirmLabel="Xóa"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.blog-category-page {
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
}

.search-wrap {
  position: relative;
  width: min(520px, 100%);
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

.table-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: var(--primary);
  font-size: 1.4rem;
}

.empty-wrap {
  padding: 20px 0 8px;
}

.empty-actions {
  margin-top: 14px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.category-card {
  padding: 22px;
  border-radius: 24px;
  background: #fff;
  border: 1px solid #edf2f7;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.card-overline {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #94a3b8;
}

.card-top h3 {
  margin-top: 8px;
  font-size: 1.2rem;
  font-weight: 800;
  color: #111827;
}

.post-count {
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 700;
}

.card-bottom {
  margin-top: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.status-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-pill {
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.76rem;
  font-weight: 800;
}

.status-active {
  background: #dcfce7;
  color: #15803d;
}

.status-inactive {
  background: #e2e8f0;
  color: #475569;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
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

@media (max-width: 900px) {
  .category-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
