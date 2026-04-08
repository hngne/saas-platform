<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { categoryService, type Category } from '@/services/category.service'
import { useAppToast } from '@/composables/useToast'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import CategoryForm from './CategoryForm.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import EmptyState from '@/components/ui/EmptyState.vue'

const toast = useAppToast()
const loading = ref(true)
const categories = ref<Category[]>([])
const search = ref('')

// Form dialog
const showForm = ref(false)
const editItem = ref<Category | null>(null)

// Delete dialog
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Category | null>(null)

const fetchCategories = async () => {
  loading.value = true
  try {
    const { data } = await categoryService.getAll()
    categories.value = data.data || []
  } catch {
    toast.error('Không thể tải danh mục')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  if (!search.value.trim()) {
    fetchCategories()
    return
  }
  loading.value = true
  try {
    const { data } = await categoryService.search(search.value)
    categories.value = data.data || []
  } catch {
    toast.error('Tìm kiếm thất bại')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editItem.value = null
  showForm.value = true
}

const openEdit = (cat: Category) => {
  editItem.value = { ...cat }
  showForm.value = true
}

const onFormSaved = () => {
  showForm.value = false
  fetchCategories()
}

const toggleActive = async (cat: Category) => {
  try {
    await categoryService.toggleActive(cat.id, !cat.is_active)
    cat.is_active = !cat.is_active
    toast.success(cat.is_active ? 'Đã kích hoạt' : 'Đã tắt')
  } catch {
    toast.error('Cập nhật thất bại')
  }
}

const confirmDelete = (cat: Category) => {
  deleteTarget.value = cat
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return
  try {
    await categoryService.delete(deleteTarget.value.id)
    toast.success('Đã xóa danh mục')
    fetchCategories()
  } catch {
    toast.error('Xóa thất bại')
  }
}

onMounted(fetchCategories)
</script>

<template>
  <div>
    <p class="page-section-label">DANH MỤC SẢN PHẨM</p>

    <!-- Header -->
    <div class="filter-bar mb-5">
      <InputText
        v-model="search"
        placeholder="Tìm danh mục..."
        class="cat-search"
        @keyup.enter="handleSearch"
      />
      <Button icon="pi pi-search" severity="secondary" text rounded @click="handleSearch" />
      <div class="ml-auto">
        <Button label="Thêm danh mục" icon="pi pi-plus" class="btn-primary" @click="openCreate" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
    </div>

    <!-- Empty -->
    <EmptyState v-else-if="categories.length === 0" icon="pi pi-tags" title="Chưa có danh mục" description="Bắt đầu tạo danh mục đầu tiên cho cửa hàng" />

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="cat-card app-card p-4 fade-in-up"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="cat-icon-wrap">
            <img v-if="cat.image_url" :src="cat.image_url" class="w-10 h-10 rounded-lg object-cover" />
            <i v-else class="pi pi-tag" style="font-size: 1.1rem; color: var(--primary)"></i>
          </div>
          <ToggleSwitch :modelValue="cat.is_active" @update:modelValue="toggleActive(cat)" />
        </div>
        <h4 class="font-semibold text-sm mb-1" style="color: var(--text-primary)">{{ cat.name }}</h4>
        <p class="text-xs mb-3" style="color: var(--text-muted); line-height: 1.5">{{ cat.description || 'Không có mô tả' }}</p>
        <div class="flex items-center gap-2">
          <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" @click="openEdit(cat)" />
          <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="confirmDelete(cat)" />
        </div>
      </div>
    </div>

    <!-- Form Dialog -->
    <CategoryForm
      v-model:visible="showForm"
      :category="editItem"
      :categories="categories"
      @saved="onFormSaved"
    />

    <!-- Delete Confirm -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      message="Bạn có chắc muốn xóa danh mục này?"
      severity="danger"
      confirmLabel="Xóa"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.cat-icon-wrap {
  width: 42px;
  height: 42px;
  background: rgba(255, 107, 43, 0.08);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-card {
  cursor: default;
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}
.cat-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}
.cat-search { width: 220px; }
@media (max-width: 768px) {
  .cat-search { width: 100% !important; }
}
</style>

