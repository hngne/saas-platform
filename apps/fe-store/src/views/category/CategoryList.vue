<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { categoryService, type Category } from '@/services/category.service'
import { useAppToast } from '@/composables/useToast'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import CategoryForm from './CategoryForm.vue'
import ToggleSwitch from 'primevue/toggleswitch'

const router = useRouter()
const toast = useAppToast()
const loading = ref(true)
const categories = ref<Category[]>([])
const search = ref('')
let searchTimer: any = null

// Form drawer (only for CREATE)
const showForm = ref(false)

// Delete dialog
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Category | null>(null)

// Stats
const totalCount = computed(() => categories.value.length)
const activeCount = computed(() => categories.value.filter(c => c.is_active).length)
const subCatCount = computed(() => categories.value.filter(c => !!c.parent_id && c.is_active).length)

// Build flat list with indent info
const flatList = computed(() => {
  const roots = categories.value.filter(c => !c.parent_id)
  const result: Array<Category & { _depth: number; _productCount?: number }> = []

  const traverse = (cats: Category[], depth: number) => {
    cats.forEach(c => {
      result.push({ ...c, _depth: depth })
      const children = categories.value.filter(ch => ch.parent_id === c.id)
      if (children.length) traverse(children, depth + 1)
    })
  }
  traverse(roots, 0)
  // Append orphans
  categories.value.forEach(c => {
    if (c.parent_id && !result.find(r => r.id === c.id)) {
      result.push({ ...c, _depth: 1 })
    }
  })
  return result
})

const getParentName = (cat: Category) => {
  if (!cat.parent_id) return null
  return categories.value.find(c => c.id === cat.parent_id)?.name || null
}

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

const onSearchInput = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    if (!search.value.trim()) {
      fetchCategories()
      return
    }
    loading.value = true
    try {
      const { data } = await categoryService.search(search.value)
      categories.value = data.data || []
    } catch { /* ignore */ } finally {
      loading.value = false
    }
  }, 350)
}

const openCreate = () => {
  showForm.value = true
}

const goEdit = (cat: Category) => {
  router.push(`/categories/${cat.id}/edit`)
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
  <div class="cat-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Quản lý Danh mục</h1>
        <p class="page-subtitle">Tổ chức sản phẩm của bạn vào các cấu trúc cây linh hoạt.</p>
      </div>
      <button class="add-btn btn-create-unified" @click="openCreate">
        <i class="pi pi-plus"></i>
        Thêm danh mục
      </button>
    </div>

    <!-- Main Table Card -->
    <div class="table-card app-card">
      <!-- Search -->
      <div class="table-toolbar">
        <div class="search-wrap">
          <i class="pi pi-search search-icon"></i>
          <input
            v-model="search"
            placeholder="Tìm danh mục, slug hoặc nhãn..."
            class="search-input"
            @input="onSearchInput"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="state-wrap">
        <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem; color: var(--primary)"></i>
      </div>

      <!-- Table -->
      <div v-else-if="flatList.length" class="table-scroll">
        <table class="cat-table">
        <thead>
          <tr>
            <th class="col-name">DANH MỤC</th>
            <th class="col-slug hide-mobile">SLUG</th>
            <th class="col-order text-center">THỨ TỰ</th>
            <th class="col-status text-center">TRẠNG THÁI</th>
            <th class="col-actions text-center">HÀNH ĐỘNG</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cat in flatList" :key="cat.id" class="cat-row" @click="goEdit(cat)">
            <td class="col-name">
              <div class="cat-name-cell" :style="{ paddingLeft: cat._depth * 32 + 'px' }">
                <!-- Thumbnail -->
                <div class="cat-thumb" :class="{ 'has-img': cat.image_url }">
                  <img v-if="cat.image_url" :src="cat.image_url" alt="" />
                  <i v-else class="pi pi-tag"></i>
                </div>
                <div class="cat-name-info">
                  <div class="cat-name-row">
                    <span class="cat-name">{{ cat.name }}</span>
                    <span v-if="getParentName(cat)" class="sub-badge">SUB</span>
                  </div>
                  <p class="cat-sub-label" v-if="!cat.parent_id">
                    {{ categories.filter(c => c.parent_id === cat.id).length }} danh mục con
                  </p>
                  <p class="cat-sub-label" v-else>
                    Con của: {{ getParentName(cat) }}
                  </p>
                </div>
              </div>
            </td>
            <td class="col-slug hide-mobile">
              <span class="slug-badge">/{{ cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-') }}</span>
            </td>
            <td class="col-order text-center">
              <span class="order-num">{{ cat.sort_order }}</span>
            </td>
            <td class="col-status text-center" @click.stop>
              <ToggleSwitch :modelValue="cat.is_active" @update:modelValue="toggleActive(cat)" />
            </td>
            <td class="col-actions text-center" @click.stop>
              <button class="act-btn" title="Sửa" @click="goEdit(cat)">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="act-btn act-delete" title="Xóa" @click="confirmDelete(cat)">
                <i class="pi pi-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
        </table>
      </div>

      <!-- Empty -->
      <div v-else class="state-wrap">
        <div class="empty-icon"><i class="pi pi-tags"></i></div>
        <h3>Chưa có danh mục</h3>
        <p>Bắt đầu tạo danh mục đầu tiên cho cửa hàng</p>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-card stat-primary">
        <p class="stat-label">TỔNG DANH MỤC</p>
        <p class="stat-value">{{ totalCount }}</p>
        <p class="stat-hint"><i class="pi pi-arrow-up-right" style="font-size: 0.7rem"></i> +2 tháng này</p>
      </div>
      <div class="stat-card stat-white">
        <p class="stat-label">ĐANG HOẠT ĐỘNG</p>
        <p class="stat-value stat-value-dark">{{ activeCount }}</p>
        <div class="stat-bar-wrap">
          <div class="stat-bar" :style="{ width: totalCount ? (activeCount / totalCount * 100) + '%' : '0%' }"></div>
        </div>
      </div>
      <div class="stat-card stat-white">
        <div class="health-header">
          <div>
            <p class="stat-label">CATEGORY HEALTH</p>
            <p class="stat-health-title">Tối ưu hoá Slug</p>
            <p class="stat-health-desc">{{ subCatCount }} danh mục con đang hoạt động.</p>
          </div>
          <button class="health-btn" @click="fetchCategories">Kiểm tra ngay</button>
        </div>
      </div>
    </div>

    <!-- Form Drawer (CREATE only) -->
    <CategoryForm
      v-model:visible="showForm"
      :category="null"
      :categories="categories"
      @saved="onFormSaved"
    />

    <!-- Delete Confirm -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      :message="`Xác nhận xóa danh mục &quot;${deleteTarget?.name}&quot;?`"
      severity="danger"
      confirmLabel="Xóa danh mục"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.cat-page { width: 100%; }

/* ═══ Header ═══ */
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
.page-title { font-size: var(--page-title-size); font-weight: 800; color: var(--text-primary); letter-spacing: var(--page-title-letter-spacing); line-height: 1.15; }
.page-subtitle { font-size: var(--page-subtitle-size); color: var(--text-muted); margin-top: 4px; line-height: var(--page-subtitle-line-height); }
.add-btn { white-space: nowrap; }

/* ═══ Table Card ═══ */
.table-card { padding: 0; overflow: hidden; margin-bottom: 16px; }
.table-toolbar { padding: 16px 20px; border-bottom: 1px solid #F3F4F6; }
.search-wrap { position: relative; max-width: 400px; }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #9CA3AF; font-size: 0.82rem; }
.search-input {
  width: 100%; padding: 10px 14px 10px 38px;
  border: 1.5px solid var(--border); border-radius: 10px;
  font-size: 0.85rem; font-family: inherit; background: #F9FAFB; outline: none; transition: all 0.2s;
}
.search-input:focus { background: #fff; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(255,107,43,0.08); }

/* ═══ Table ═══ */
.table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.cat-table { width: 100%; min-width: 760px; border-collapse: collapse; }
.cat-table thead th {
  font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; color: #9CA3AF;
  text-transform: uppercase; padding: 12px 16px; border-bottom: 1px solid var(--border); text-align: left;
}
.cat-row { cursor: pointer; transition: background 0.15s; }
.cat-row:hover { background: #FEFAF7; }
.cat-row td { padding: 16px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }

/* Name cell */
.cat-name-cell { display: flex; align-items: center; gap: 14px; }
.cat-thumb {
  width: 44px; height: 44px; border-radius: 12px;
  background: #F1F5F9; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; overflow: hidden; border: 1px solid #E5E7EB;
  color: #CBD5E1; font-size: 1rem;
}
.cat-thumb.has-img { border: none; }
.cat-thumb img { width: 100%; height: 100%; object-fit: cover; }
.cat-name-info { min-width: 0; }
.cat-name-row { display: flex; align-items: center; gap: 8px; }
.cat-name { font-weight: 700; font-size: 0.92rem; color: var(--text-primary); }
.sub-badge {
  display: inline-flex; align-items: center; gap: 3px;
  background: #FFF7ED; color: #C2410C;
  font-size: 0.55rem; font-weight: 800; padding: 2px 6px;
  border-radius: 4px; letter-spacing: 0.05em;
}
.cat-sub-label { font-size: 0.72rem; color: #9CA3AF; margin-top: 2px; }

.slug-badge {
  display: inline-block; padding: 4px 10px;
  background: #FFF7ED; color: #9A3412;
  border-radius: 6px; font-size: 0.75rem; font-family: monospace; font-weight: 500;
}
.order-num { font-weight: 700; font-size: 0.88rem; color: var(--text-primary); }
.text-center { text-align: center; }

/* Actions */
.act-btn {
  width: 34px; height: 34px; border: none; background: transparent; border-radius: 8px;
  cursor: pointer; color: #9CA3AF; font-size: 0.85rem; transition: all 0.2s;
  display: inline-flex; align-items: center; justify-content: center;
}
.act-btn:hover { background: #F3F4F6; color: var(--text-primary); }
.act-delete:hover { background: #FEF2F2; color: #EF4444; }

/* ═══ States ═══ */
.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 8px; color: #9CA3AF; }
.empty-icon { width: 60px; height: 60px; border-radius: 16px; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #CBD5E1; margin-bottom: 8px; }
.state-wrap h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
.state-wrap p { font-size: 0.82rem; color: #9CA3AF; }

/* ═══ Stats Row ═══ */
.stats-row { display: grid; grid-template-columns: 280px 1fr 1fr; gap: 16px; }
.stat-card { border-radius: 14px; padding: 22px; transition: transform 0.2s; }
.stat-card:hover { transform: translateY(-2px); }
.stat-primary { background: var(--primary); color: #fff; }
.stat-white { background: #fff; border: 1px solid var(--border); }
.stat-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.75; margin-bottom: 8px; }
.stat-primary .stat-label { color: rgba(255,255,255,0.85); }
.stat-white .stat-label { color: #9CA3AF; }
.stat-value { font-size: 2.2rem; font-weight: 800; color: #fff; line-height: 1; margin-bottom: 8px; }
.stat-value-dark { color: var(--text-primary); }
.stat-hint { font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.75); display: flex; align-items: center; gap: 4px; }
.stat-bar-wrap { height: 6px; background: #F3F4F6; border-radius: 10px; margin-top: 16px; overflow: hidden; }
.stat-bar { height: 100%; background: linear-gradient(to right, var(--primary), var(--gold)); border-radius: 10px; transition: width 0.5s ease; }
.health-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.stat-health-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.stat-health-desc { font-size: 0.75rem; color: #9CA3AF; }
.health-btn { white-space: nowrap; padding: 6px 14px; border: 1.5px solid var(--border); border-radius: 8px; background: #fff; font-size: 0.75rem; font-weight: 600; color: var(--text-primary); cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
.health-btn:hover { border-color: var(--primary); color: var(--primary); }

@media (max-width: 1024px) { .stats-row { grid-template-columns: 1fr 1fr; } }
@media (max-width: 768px) {
  .page-header { flex-direction: column; }
  .stats-row { grid-template-columns: 1fr; }
  .hide-mobile { display: none; }
}

@media (max-width: 640px) {
  .cat-page { max-width: 100%; }
  .page-header { gap: 14px; margin-bottom: 18px; }
  .add-btn { width: 100%; justify-content: center; }
  .table-toolbar { padding: 14px; }
  .search-wrap { max-width: none; width: 100%; }
  .table-scroll { overflow-x: visible; }
  .cat-table,
  .cat-table thead,
  .cat-table tbody,
  .cat-table tr,
  .cat-table td {
    display: block;
    width: 100%;
    min-width: 0;
  }
  .cat-table thead { display: none; }
  .cat-table { border-collapse: separate; }
  .cat-table tbody {
    display: grid;
    gap: 12px;
    padding: 12px;
  }
  .cat-row {
    border: 1px solid #F3F4F6;
    border-radius: 12px;
    background: #fff;
    overflow: hidden;
  }
  .cat-row td {
    padding: 12px 14px;
    border-bottom: 1px solid #F3F4F6;
  }
  .cat-row td:last-child { border-bottom: 0; }
  .cat-name-cell {
    padding-left: 0 !important;
    align-items: flex-start;
  }
  .cat-name-info { flex: 1; }
  .col-slug,
  .col-order,
  .col-status,
  .col-actions {
    display: flex !important;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
  }
  .col-slug::before,
  .col-order::before,
  .col-status::before,
  .col-actions::before {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #9CA3AF;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .col-slug::before { content: "Slug"; }
  .col-order::before { content: "Thứ tự"; }
  .col-status::before { content: "Trạng thái"; }
  .col-actions::before { content: "Thao tác"; }
  .stats-row { gap: 12px; }
  .stat-card { padding: 18px; }
  .health-header { flex-direction: column; }
  .health-btn { width: 100%; }
}
</style>
