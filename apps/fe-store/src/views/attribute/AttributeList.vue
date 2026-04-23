<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { attributeService, type Attribute } from '@/services/attribute.service'
import { useAppToast } from '@/composables/useToast'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import AttributeForm from './AttributeForm.vue'

const router = useRouter()
const toast = useAppToast()
const loading = ref(true)
const attributes = ref<Attribute[]>([])
const search = ref('')
let searchTimer: any = null

// Form drawer (CREATE only)
const showForm = ref(false)

// Delete
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Attribute | null>(null)

// Stats
const totalCount = computed(() => attributes.value.length)
const totalValues = computed(() => attributes.value.reduce((s, a) => s + (a.values?.length || 0), 0))

// Icon/color per attribute name
const attrIcons: Record<string, { icon: string; bg: string; color: string }> = {
  'Màu sắc': { icon: 'pi pi-palette', bg: '#FFF1F2', color: '#E11D48' },
  'Kích cỡ': { icon: 'pi pi-th-large', bg: '#EFF6FF', color: '#2563EB' },
  'Chất liệu': { icon: 'pi pi-slack', bg: '#ECFDF5', color: '#059669' },
}
const defaultIcon = { icon: 'pi pi-tag', bg: '#FFF7ED', color: '#C2410C' }

const getAttrIcon = (name: string) => attrIcons[name] || defaultIcon

const getSlug = (name: string) => {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

const filteredAttrs = computed(() => {
  if (!search.value.trim()) return attributes.value
  const q = search.value.toLowerCase()
  return attributes.value.filter(a =>
    a.name.toLowerCase().includes(q) ||
    a.values?.some(v => v.value.toLowerCase().includes(q))
  )
})

const fetchAttributes = async () => {
  loading.value = true
  try {
    const { data } = await attributeService.getAll()
    attributes.value = Array.isArray(data.data) ? data.data : []
  } catch {
    toast.error('Không thể tải thuộc tính')
  } finally {
    loading.value = false
  }
}

const onSearchInput = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {}, 300)
}

const openCreate = () => {
  showForm.value = true
}

const goEdit = (attr: Attribute) => {
  router.push(`/attributes/${attr.id}/edit`)
}

const onFormSaved = () => {
  showForm.value = false
  fetchAttributes()
}

const confirmDelete = (attr: Attribute) => {
  deleteTarget.value = attr
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return
  try {
    await attributeService.delete(deleteTarget.value.id)
    toast.success('Đã xóa thuộc tính')
    fetchAttributes()
  } catch {
    toast.error('Xóa thất bại')
  }
}

onMounted(fetchAttributes)
</script>

<template>
  <div class="attr-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Quản lý Thuộc tính</h1>
        <p class="page-subtitle">Tổ chức và quản lý các biến thể sản phẩm như kích thước, màu sắc và chất liệu để tối ưu hóa trải nghiệm mua sắm.</p>
      </div>
      <button class="add-btn btn-create-unified" @click="openCreate">
        <i class="pi pi-plus"></i>
        Thêm thuộc tính
      </button>
    </div>

    <!-- Table Card -->
    <div class="table-card app-card">
      <!-- Table Header -->
      <div class="table-header">
        <div class="table-title-row">
          <h2 class="table-title">Danh sách thuộc tính</h2>
          <span class="total-badge">{{ totalCount }} TOTAL</span>
        </div>
        <div class="table-tools">
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <input
              v-model="search"
              placeholder="Tìm kiếm thuộc tính..."
              class="search-input"
              @input="onSearchInput"
            />
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="state-wrap">
        <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem; color: var(--primary)"></i>
      </div>

      <!-- Table -->
      <div v-else-if="filteredAttrs.length" class="table-scroll">
        <table class="attr-table">
        <thead>
          <tr>
            <th class="col-name">TÊN THUỘC TÍNH</th>
            <th class="col-count text-center">SỐ LƯỢNG GIÁ TRỊ</th>
            <th class="col-values">DANH SÁCH GIÁ TRỊ</th>
            <th class="col-actions text-center">HÀNH ĐỘNG</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="attr in filteredAttrs" :key="attr.id" class="attr-row" @click="goEdit(attr)">
            <td class="col-name">
              <div class="attr-name-cell">
                <div class="attr-icon" :style="{ background: getAttrIcon(attr.name).bg, color: getAttrIcon(attr.name).color }">
                  <i :class="getAttrIcon(attr.name).icon"></i>
                </div>
                <div>
                  <p class="attr-name">{{ attr.name }}</p>
                  <p class="attr-slug">{{ getSlug(attr.name) }}</p>
                </div>
              </div>
            </td>
            <td class="col-count text-center">
              <span class="count-num">{{ attr.values?.length || 0 }}</span>
            </td>
            <td class="col-values">
              <div class="value-chips">
                <span v-for="val in attr.values?.slice(0, 6)" :key="val.id" class="val-chip">
                  <span v-if="val.color_hex" class="val-dot" :style="{ background: val.color_hex }"></span>
                  {{ val.value }}
                </span>
                <span v-if="(attr.values?.length || 0) > 6" class="val-chip val-more">+{{ attr.values!.length - 6 }}</span>
              </div>
            </td>
            <td class="col-actions text-center" @click.stop>
              <button class="act-btn" title="Sửa" @click="goEdit(attr)">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="act-btn act-delete" title="Xóa" @click="confirmDelete(attr)">
                <i class="pi pi-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
        </table>
      </div>

      <!-- Empty -->
      <div v-else class="state-wrap">
        <div class="empty-icon"><i class="pi pi-palette"></i></div>
        <h3>Chưa có thuộc tính</h3>
        <p>Tạo thuộc tính như Màu sắc, Kích thước...</p>
      </div>

      <!-- Pagination info -->
      <div v-if="filteredAttrs.length" class="pagination-bar">
        <span class="pagination-info">Hiển thị 1 - {{ filteredAttrs.length }} của {{ totalCount }} thuộc tính</span>
      </div>
    </div>

    <!-- Bottom Cards -->
    <div class="bottom-cards">
      <div class="tip-card">
        <p class="tip-overline">MẸO QUẢN LÝ</p>
        <h3 class="tip-title">Chuẩn hóa tên gợi</h3>
        <p class="tip-desc">Sử dụng tên gọi thống nhất cho thuộc tính giúp bộ lọc tìm kiếm trên website hoạt động chính xác hơn.</p>
      </div>
      <div class="info-card">
        <div class="info-card-content">
          <h3 class="info-title">Thuộc tính & Biến thể</h3>
          <p class="info-desc">Hệ thống cho phép bạn tạo ra hàng ngàn tổ hợp biến thể từ một vài thuộc tính cơ bản. Hãy bắt đầu bằng cách định nghĩa các thuộc tính cốt lõi.</p>
          <a class="info-link" href="#">Tìm hiểu thêm về cấu trúc dữ liệu →</a>
        </div>
      </div>
    </div>

    <!-- Form Drawer -->
    <AttributeForm
      v-model:visible="showForm"
      @saved="onFormSaved"
    />

    <!-- Delete Confirm -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      :message="`Xác nhận xóa thuộc tính &quot;${deleteTarget?.name}&quot;? Tất cả giá trị cũng sẽ bị xóa.`"
      severity="danger"
      confirmLabel="Xóa thuộc tính"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.attr-page { max-width: 1200px; }

.add-btn { flex-shrink: 0; }

/* ═══ Table Card ═══ */
.table-card { padding: 0; overflow: hidden; margin-bottom: 16px; }
.table-header { padding: 20px 20px 16px; }
.table-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.table-title { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
.total-badge {
  display: inline-block; padding: 3px 10px; border-radius: 20px;
  background: #ECFDF5; color: #059669; font-size: 0.62rem; font-weight: 800; letter-spacing: 0.06em;
}
.table-tools { display: flex; align-items: center; gap: 12px; }
.search-wrap { position: relative; flex: 1; max-width: 320px; }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #9CA3AF; font-size: 0.82rem; }
.search-input {
  width: 100%; padding: 9px 14px 9px 38px;
  border: 1.5px solid var(--border); border-radius: 10px;
  font-size: 0.82rem; font-family: inherit; background: #F9FAFB; outline: none; transition: all 0.2s;
}
.search-input:focus { background: #fff; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(255,107,43,0.08); }

/* ═══ Table ═══ */
.table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.attr-table { width: 100%; min-width: 760px; border-collapse: collapse; }
.attr-table thead th {
  font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; color: #9CA3AF;
  text-transform: uppercase; padding: 12px 20px; border-bottom: 1px solid var(--border); border-top: 1px solid #F3F4F6; text-align: left;
}
.attr-row { transition: background 0.15s; }
.attr-row:hover { background: #FEFAF7; }
.attr-row td { padding: 18px 20px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }

/* Name cell */
.attr-name-cell { display: flex; align-items: center; gap: 14px; }
.attr-icon {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; flex-shrink: 0;
}
.attr-name { font-weight: 700; font-size: 0.92rem; color: var(--text-primary); }
.attr-slug { font-size: 0.68rem; color: #9CA3AF; font-family: monospace; margin-top: 2px; }

/* Count */
.count-num { font-size: 1.3rem; font-weight: 800; color: var(--text-primary); }
.text-center { text-align: center; }

/* Value chips */
.value-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.val-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 12px; background: #F3F4F6; border-radius: 6px;
  font-size: 0.72rem; font-weight: 600; color: #374151; white-space: nowrap;
}
.val-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.1); }
.val-more { background: #FFF7ED; color: var(--primary); }

/* Actions */
.act-btn {
  width: 34px; height: 34px; border: none; background: transparent; border-radius: 8px;
  cursor: pointer; color: #9CA3AF; font-size: 0.88rem; transition: all 0.2s;
  display: inline-flex; align-items: center; justify-content: center;
}
.act-btn:hover { background: #F3F4F6; color: var(--text-primary); }
.act-delete:hover { background: #FEF2F2; color: #EF4444; }

/* States */
.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 8px; color: #9CA3AF; }
.empty-icon { width: 60px; height: 60px; border-radius: 16px; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #CBD5E1; margin-bottom: 8px; }
.state-wrap h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
.state-wrap p { font-size: 0.82rem; }

/* Pagination */
.pagination-bar { padding: 14px 20px; border-top: 1px solid #F3F4F6; }
.pagination-info { font-size: 0.78rem; color: #6B7280; }

/* ═══ Bottom Cards ═══ */
.bottom-cards { display: grid; grid-template-columns: 1fr 1.5fr; gap: 16px; }
.tip-card {
  background: linear-gradient(135deg, var(--primary), var(--gold)); border-radius: 14px;
  padding: 24px; color: #fff;
}
.tip-overline { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.7); margin-bottom: 8px; }
.tip-title { font-size: 1.1rem; font-weight: 800; margin-bottom: 8px; }
.tip-desc { font-size: 0.78rem; line-height: 1.6; color: rgba(255,255,255,0.85); }

.info-card {
  background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 14px;
  padding: 24px; display: flex; gap: 16px;
}
.info-card-content { flex: 1; }
.info-title { font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin-bottom: 8px; }
.info-desc { font-size: 0.78rem; color: #6B7280; line-height: 1.6; margin-bottom: 12px; }
.info-link { font-size: 0.78rem; font-weight: 600; color: var(--primary); text-decoration: none; }
.info-link:hover { text-decoration: underline; }

@media (max-width: 900px) {
  .bottom-cards { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .attr-page { max-width: 100%; }
  .add-btn { width: 100%; justify-content: center; }
  .table-header { padding: 16px; }
  .table-title-row { flex-wrap: wrap; }
  .table-tools { width: 100%; }
  .search-wrap { max-width: none; width: 100%; }
  .table-scroll { overflow-x: visible; }
  .attr-table,
  .attr-table thead,
  .attr-table tbody,
  .attr-table tr,
  .attr-table td {
    display: block;
    width: 100%;
    min-width: 0;
  }
  .attr-table thead { display: none; }
  .attr-table { border-collapse: separate; }
  .attr-table tbody {
    display: grid;
    gap: 12px;
    padding: 12px;
  }
  .attr-row {
    border: 1px solid #F3F4F6;
    border-radius: 12px;
    background: #fff;
    overflow: hidden;
  }
  .attr-row td {
    padding: 12px 14px;
    border-bottom: 1px solid #F3F4F6;
  }
  .attr-row td:last-child { border-bottom: 0; }
  .col-count,
  .col-values,
  .col-actions {
    display: flex !important;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
  }
  .col-count::before,
  .col-values::before,
  .col-actions::before {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #9CA3AF;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .col-count::before { content: "Giá trị"; }
  .col-values::before { content: "Danh sách"; }
  .col-actions::before { content: "Thao tác"; }
  .value-chips {
    justify-content: flex-end;
    max-width: 68%;
  }
  .pagination-bar { padding: 12px 16px; }
  .bottom-cards { gap: 12px; }
  .tip-card,
  .info-card { padding: 18px; }
}
</style>
