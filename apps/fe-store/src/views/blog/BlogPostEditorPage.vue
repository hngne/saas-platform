<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { blogPostService, type BlogPostStatus, type CreateBlogPostDto } from '@/services/blog-post.service'
import { blogCategoryService, type BlogCategory } from '@/services/blog-category.service'
import { useAppToast } from '@/composables/useToast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'

const route = useRoute()
const router = useRouter()
const toast = useAppToast()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const saving = ref(false)
const categories = ref<BlogCategory[]>([])

const form = ref({
  blog_category_id: null as string | null,
  title: '',
  thumbnail_url: '',
  content: '',
  status: 'DRAFT' as BlogPostStatus,
  tagsText: '',
})

const categoryOptions = computed(() => [
  { label: 'Không gắn danh mục', value: null },
  ...categories.value
    .filter((category) => category.is_active)
    .map((category) => ({
      label: category.name,
      value: category.id,
    })),
])

const tagList = computed(() =>
  form.value.tagsText
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean),
)

const previewStatus = computed(() =>
  form.value.status === 'PUBLISHED' ? 'Sẵn sàng xuất bản' : 'Đang ở trạng thái nháp',
)

const pageTitle = computed(() => (isEdit.value ? 'Chỉnh sửa bài viết blog' : 'Tạo bài viết blog'))

const fetchData = async () => {
  loading.value = true
  try {
    const [{ data: categoryData }, postResponse] = await Promise.all([
      blogCategoryService.getAll(),
      isEdit.value ? blogPostService.getById(route.params.id as string) : Promise.resolve(null),
    ])

    categories.value = categoryData.data || []

    if (postResponse) {
      const post = postResponse.data.data
      form.value = {
        blog_category_id: post.blog_category_id || null,
        title: post.title || '',
        thumbnail_url: post.thumbnail_url || '',
        content: post.content || '',
        status: post.status,
        tagsText: (post.tags || []).map((tag: any) => tag.tag).join(', '),
      }
    }
  } catch {
    toast.error('Không thể tải dữ liệu bài viết')
  } finally {
    loading.value = false
  }
}

const validateForm = () => {
  if (!form.value.title.trim()) {
    toast.warn('Tiêu đề bài viết không được để trống')
    return false
  }

  if (!form.value.content.trim()) {
    toast.warn('Nội dung bài viết không được để trống')
    return false
  }

  return true
}

const handleSubmit = async () => {
  if (!validateForm()) return

  const dto: CreateBlogPostDto = {
    blog_category_id: form.value.blog_category_id,
    title: form.value.title.trim(),
    thumbnail_url: form.value.thumbnail_url.trim() || null,
    content: form.value.content.trim(),
    status: form.value.status,
    tags: tagList.value,
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await blogPostService.update(route.params.id as string, dto)
      toast.success('Đã cập nhật bài viết blog')
    } else {
      await blogPostService.create(dto)
      toast.success('Đã tạo bài viết blog')
    }
    router.push('/blog/posts')
  } catch (error: any) {
    toast.error('Lỗi', error?.response?.data?.message || 'Không thể lưu bài viết blog')
  } finally {
    saving.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div v-if="loading" class="editor-loading">
    <i class="pi pi-spin pi-spinner"></i>
  </div>

  <div v-else class="blog-post-editor">
    <section class="page-header">
      <div>
        <h1 class="page-title">{{ pageTitle }}</h1>
        <p class="page-subtitle">
          Soạn thảo bài viết blog với tiêu đề, danh mục, thumbnail, tags và nội dung hoàn chỉnh.
        </p>
      </div>

      <Button
        :label="isEdit ? 'Lưu bài viết' : 'Tạo bài viết'"
        class="btn-create-unified"
        :loading="saving"
        @click="handleSubmit"
      />
    </section>

    <section class="editor-grid">
      <article class="main-card">
        <div class="field-stack">
          <label>Tiêu đề bài viết</label>
          <InputText v-model="form.title" class="w-full" placeholder="Ví dụ: 5 tips phối outfit mùa hè" />
        </div>

        <div class="field-stack">
          <label>Thumbnail URL</label>
          <InputText v-model="form.thumbnail_url" class="w-full" placeholder="https://..." />
        </div>

        <div class="field-grid">
          <div class="field-stack">
            <label>Danh mục blog</label>
            <Select
              v-model="form.blog_category_id"
              :options="categoryOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>

          <div class="field-stack">
            <label>Trạng thái</label>
            <Select
              v-model="form.status"
              :options="[
                { label: 'Nháp', value: 'DRAFT' },
                { label: 'Xuất bản', value: 'PUBLISHED' },
              ]"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>
        </div>

        <div class="field-stack">
          <label>Tags</label>
          <InputText v-model="form.tagsText" class="w-full" placeholder="fashion, summer, tips" />
          <span class="field-hint">Nhập tags cách nhau bằng dấu phẩy.</span>
        </div>

        <div class="field-stack">
          <label>Nội dung bài viết</label>
          <Textarea
            v-model="form.content"
            rows="16"
            autoResize
            class="w-full"
            placeholder="Nhập nội dung chi tiết cho bài viết..."
          />
        </div>
      </article>

      <aside class="side-stack">
        <article class="preview-card">
          <span class="preview-label">Preview</span>
          <h3>{{ form.title || 'Tiêu đề bài viết mới' }}</h3>
          <p>{{ previewStatus }}</p>

          <div class="chip-row">
            <span class="preview-chip">{{ form.status === 'PUBLISHED' ? 'Published' : 'Draft' }}</span>
            <span class="preview-chip">{{ tagList.length }} tags</span>
          </div>
        </article>

        <article class="meta-card">
          <div class="meta-row">
            <strong>Danh mục</strong>
            <span>{{ categoryOptions.find((item) => item.value === form.blog_category_id)?.label || 'Không gắn danh mục' }}</span>
          </div>
          <div class="meta-row">
            <strong>Số tags</strong>
            <span>{{ tagList.length }}</span>
          </div>
          <div class="meta-row">
            <strong>Thumbnail</strong>
            <span>{{ form.thumbnail_url ? 'Đã gắn URL ảnh' : 'Chưa có ảnh đại diện' }}</span>
          </div>
        </article>

        <article class="toggle-card">
          <div>
            <strong>Xuất bản ngay</strong>
            <p>Bật nhanh sang trạng thái xuất bản nếu bài viết đã sẵn sàng.</p>
          </div>
          <ToggleSwitch :modelValue="form.status === 'PUBLISHED'" @update:modelValue="form.status = $event ? 'PUBLISHED' : 'DRAFT'" />
        </article>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.blog-post-editor {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  color: var(--primary);
  font-size: 2rem;
}

.main-card,
.preview-card,
.meta-card,
.toggle-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 249, 245, 0.92));
  border: 1px solid #edf2f7;
  border-radius: 28px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.04);
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
  gap: 20px;
  align-items: start;
}

.main-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field-stack label {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #3f2a21;
}

.field-hint {
  color: #94a3b8;
  line-height: 1.5;
}

.field-stack :deep(.p-inputtext),
.field-stack :deep(.p-textarea),
.field-stack :deep(.p-select) {
  border-radius: 16px;
  border-color: #e2e8f0;
  background: #f8fbff;
}

.field-stack :deep(.p-inputtext),
.field-stack :deep(.p-select-label) {
  min-height: 52px;
  display: flex;
  align-items: center;
}

.field-stack :deep(.p-textarea) {
  min-height: 340px;
}

.side-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.preview-card,
.meta-card,
.toggle-card {
  padding: 22px;
}

.preview-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c2410c;
}

.preview-card h3 {
  margin-top: 10px;
  font-size: 1.3rem;
  font-weight: 900;
  color: #111827;
}

.preview-card p {
  margin-top: 8px;
  color: #64748b;
  line-height: 1.7;
}

.chip-row {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preview-chip {
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 700;
}

.meta-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.meta-row strong {
  color: #111827;
}

.meta-row span {
  color: #64748b;
  text-align: right;
}

.toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toggle-card strong {
  display: block;
  color: #111827;
}

.toggle-card p {
  margin-top: 6px;
  color: #64748b;
  line-height: 1.65;
}

@media (max-width: 980px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .blog-post-editor {
    gap: 18px;
  }

  .main-card,
  .preview-card,
  .meta-card,
  .toggle-card {
    border-radius: 22px;
  }

  .main-card,
  .preview-card,
  .meta-card,
  .toggle-card {
    padding: 20px;
  }

}
</style>
