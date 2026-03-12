<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";
import InputText from "primevue/inputtext";
import DataTable from "primevue/datatable";
import Column from "primevue/column";

const router = useRouter();

interface Tenant {
  id: string;
  slug: string;
  status: string;
  created_at: string;
  profile?: {
    store_name: string;
    logo_url?: string;
  };
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const tenants = ref<Tenant[]>([]);
const meta = ref<Meta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
const loading = ref(true);

const keyword = ref("");
const status = ref<string | null>(null);
const page = ref(1);

const fetchTenants = async () => {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: page.value,
      limit: 10,
    };
    if (keyword.value) params.keyword = keyword.value;
    if (status.value) params.status = status.value;

    const { data } = await api.get("/admin/tenants", { params });
    tenants.value = data.data.items;
    meta.value = data.data.meta;
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false;
  }
};

onMounted(fetchTenants);

let searchTimeout: ReturnType<typeof setTimeout>;
watch(keyword, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    fetchTenants();
  }, 400);
});

const setStatus = (s: string | null) => {
  status.value = s;
  page.value = 1;
  fetchTenants();
};

const onPageChange = (event: any) => {
  page.value = event.page + 1;
  fetchTenants();
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const viewDetail = (tenant: Tenant) => {
  router.push(`/tenants/${tenant.id}`);
};

// Tính số thứ tự theo page
const getRowIndex = (index: number) => {
  return (meta.value.page - 1) * meta.value.limit + index + 1;
};
</script>

<template>
  <div class="tl-wrapper">

    <!-- Page Header -->
    <div class="tl-header">
      <div>
        <h1 class="tl-title">
          Quản lý Tenant
          <span class="tl-badge">{{ meta.total }} Tổng</span>
        </h1>
        <p class="tl-subtitle">Quản lý và theo dõi tất cả cửa hàng trên nền tảng</p>
      </div>
    </div>

    <!-- Main Card -->
    <div class="tl-card">

      <!-- Toolbar -->
      <div class="tl-toolbar">
        <!-- Search -->
        <div class="tl-search-wrap">
          <i class="pi pi-search tl-search-icon"></i>
          <InputText
            v-model="keyword"
            placeholder="Tìm theo tên cửa hàng, ID..."
            class="tl-search-input"
          />
        </div>

        <!-- Status Filter -->
        <div class="tl-filter-group">
          <button
            class="tl-filter-btn"
            :class="{ 'tl-filter-btn--active': status === null }"
            @click="setStatus(null)"
          >Tất cả</button>
          <button
            class="tl-filter-btn"
            :class="{ 'tl-filter-btn--active-green': status === 'ACTIVE' }"
            @click="setStatus('ACTIVE')"
          >Active</button>
          <button
            class="tl-filter-btn"
            :class="{ 'tl-filter-btn--active-red': status === 'BANNED' }"
            @click="setStatus('BANNED')"
          >Banned</button>
        </div>
      </div>

      <!-- ===== Mobile Card List (< md) ===== -->
      <div class="md:hidden">
        <div v-if="loading" class="tl-loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <div v-else-if="tenants.length === 0" class="tl-empty">
          <i class="pi pi-inbox tl-empty-icon"></i>
          <p>Không tìm thấy tenant nào.</p>
        </div>

        <div v-else class="flex flex-col">
          <div
            v-for="(tenant, index) in tenants"
            :key="tenant.id"
            class="tl-mobile-row"
          >
            <div class="flex items-start gap-3 mb-3">
              <span class="tl-row-num">{{ getRowIndex(index) }}</span>
              <div class="tl-store-icon">
                <i class="pi pi-shopping-bag"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="font-bold text-gray-900 text-sm truncate">
                    {{ tenant.profile?.store_name || 'Khách hàng mới' }}
                  </span>
                  <span class="tl-status-badge" :class="tenant.status === 'ACTIVE' ? 'tl-status--active' : 'tl-status--banned'">
                    <span class="tl-status-dot"></span>
                    {{ tenant.status }}
                  </span>
                </div>
                <div class="flex items-center gap-1 text-xs text-indigo-600 mb-0.5">
                  <i class="pi pi-globe text-[0.6rem]"></i>
                  <span class="font-medium">{{ tenant.slug }}.retail.com</span>
                </div>
                <span class="text-[0.7rem] text-gray-400 font-mono">ID: {{ tenant.id.substring(0, 8).toUpperCase() }}</span>
              </div>
            </div>
            <div class="flex items-center justify-between pl-[3.25rem]">
              <span class="text-xs text-gray-400">{{ formatDate(tenant.created_at) }}</span>
              <button class="tl-detail-btn" @click="viewDetail(tenant)">Xem chi tiết</button>
            </div>
          </div>
        </div>

        <!-- Mobile Pagination -->
        <div v-if="meta.totalPages > 1" class="tl-mobile-pager">
          <button
            class="tl-pager-btn"
            :disabled="page <= 1"
            @click="page--; fetchTenants()"
          >
            <i class="pi pi-chevron-left text-xs mr-1"></i> Trước
          </button>
          <span class="text-xs text-gray-500">{{ page }} / {{ meta.totalPages }}</span>
          <button
            class="tl-pager-btn"
            :disabled="page >= meta.totalPages"
            @click="page++; fetchTenants()"
          >
            Sau <i class="pi pi-chevron-right text-xs ml-1"></i>
          </button>
        </div>
      </div>

      <!-- ===== Desktop DataTable (>= md) ===== -->
      <div class="hidden md:block">
        <DataTable
          :value="tenants"
          :loading="loading"
          :lazy="true"
          :paginator="true"
          :rows="10"
          :total-records="meta.total"
          :first="(meta.page - 1) * meta.limit"
          @page="onPageChange"
          class="tl-datatable"
        >
          <template #empty>
            <div class="tl-empty">
              <i class="pi pi-inbox tl-empty-icon"></i>
              <p>Không tìm thấy tenant nào.</p>
            </div>
          </template>

          <!-- # STT -->
          <Column header="#" style="width: 56px; text-align: center">
            <template #body="slotProps">
              <span class="tl-stt">{{ getRowIndex(slotProps.index) }}</span>
            </template>
          </Column>

          <!-- Cửa hàng -->
          <Column header="Cửa hàng" style="min-width: 220px">
            <template #body="slotProps">
              <div class="flex items-center gap-3">
                <div class="tl-store-icon">
                  <i class="pi pi-shopping-bag"></i>
                </div>
                <div class="flex flex-col">
                  <span class="font-bold text-gray-900 text-sm">
                    {{ slotProps.data.profile?.store_name || 'Khách hàng mới' }}
                  </span>
                  <span class="text-[0.7rem] text-gray-400 font-mono">
                    ID: {{ slotProps.data.id.substring(0, 8).toUpperCase() }}
                  </span>
                </div>
              </div>
            </template>
          </Column>

          <!-- Slug -->
          <Column header="Slug" style="min-width: 200px">
            <template #body="slotProps">
              <div class="flex items-center gap-1.5">
                <i class="pi pi-globe text-gray-400 text-xs"></i>
                <span class="text-sm font-medium text-indigo-600 hover:underline cursor-pointer">
                  {{ slotProps.data.slug }}.retail.com
                </span>
              </div>
            </template>
          </Column>

          <!-- Loại hình -->
          <Column header="Loại hình" style="min-width: 110px">
            <template #body>
              <span class="tl-type-badge">RETAIL</span>
            </template>
          </Column>

          <!-- Trạng thái -->
          <Column header="Trạng thái" style="min-width: 120px">
            <template #body="slotProps">
              <span
                class="tl-status-badge"
                :class="slotProps.data.status === 'ACTIVE' ? 'tl-status--active' : 'tl-status--banned'"
              >
                <span class="tl-status-dot"></span>
                {{ slotProps.data.status }}
              </span>
            </template>
          </Column>

          <!-- Ngày tạo -->
          <Column header="Ngày tạo" style="min-width: 120px">
            <template #body="slotProps">
              <span class="text-sm text-gray-600">
                {{ formatDate(slotProps.data.created_at) }}
              </span>
            </template>
          </Column>

          <!-- Thao tác -->
          <Column header="Thao tác" style="min-width: 110px; text-align: right">
            <template #body="slotProps">
              <button class="tl-detail-btn" @click="viewDetail(slotProps.data)">
                Xem chi tiết
              </button>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== Wrapper ===== */
.tl-wrapper {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ===== Header ===== */
.tl-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.tl-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  letter-spacing: -0.4px;
  line-height: 1.2;
}

.tl-badge {
  font-size: 0.72rem;
  font-weight: 700;
  background: #eef2ff;
  color: #4f46e5;
  padding: 0.25rem 0.65rem;
  border-radius: 99px;
  letter-spacing: 0;
}

.tl-subtitle {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.3rem;
}

/* ===== Main Card ===== */
.tl-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  overflow: hidden;
}

/* ===== Toolbar ===== */
.tl-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
}

/* Search */
.tl-search-wrap {
  position: relative;
  width: 100%;
  max-width: 320px;
}

.tl-search-icon {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 0.85rem;
  pointer-events: none;
}

.tl-search-input {
  width: 100% !important;
  padding: 0.55rem 1rem 0.55rem 2.4rem !important;
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px !important;
  font-size: 0.855rem !important;
  color: #334155 !important;
  transition: border-color 0.15s, box-shadow 0.15s !important;
}

.tl-search-input:focus {
  background: #fff !important;
  border-color: #6366f1 !important;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important;
  outline: none !important;
}

/* Filter buttons */
.tl-filter-group {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 3px;
}

.tl-filter-btn {
  padding: 0.4rem 1rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  color: #64748b;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.tl-filter-btn:hover {
  color: #334155;
}

.tl-filter-btn--active {
  background: #fff;
  color: #0f172a;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.tl-filter-btn--active-green {
  background: #fff;
  color: #16a34a;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.tl-filter-btn--active-red {
  background: #fff;
  color: #dc2626;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* ===== Loading / Empty ===== */
.tl-loading {
  display: flex;
  justify-content: center;
  padding: 4rem 0;
  color: #6366f1;
  font-size: 2rem;
}

.tl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  color: #94a3b8;
  gap: 0.75rem;
}

.tl-empty-icon {
  font-size: 2.5rem;
  color: #cbd5e1;
}

/* ===== Store icon ===== */
.tl-store-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #eef2ff;
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

/* ===== STT ===== */
.tl-stt {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
}

/* ===== Type badge ===== */
.tl-type-badge {
  display: inline-flex;
  background: #f1f5f9;
  color: #475569;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.6px;
}

/* ===== Status badge ===== */
.tl-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.65rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.4px;
}

.tl-status--active {
  background: #f0fdf4;
  color: #16a34a;
}

.tl-status--active .tl-status-dot {
  background: #22c55e;
}

.tl-status--banned {
  background: #fef2f2;
  color: #dc2626;
}

.tl-status--banned .tl-status-dot {
  background: #ef4444;
}

.tl-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ===== Detail button ===== */
.tl-detail-btn {
  padding: 0.4rem 0.85rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #6366f1;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.tl-detail-btn:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
}

/* ===== Mobile row ===== */
.tl-mobile-row {
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s;
}

.tl-mobile-row:last-child {
  border-bottom: none;
}

.tl-mobile-row:hover {
  background: #f8fafc;
}

.tl-row-num {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  width: 20px;
  flex-shrink: 0;
  padding-top: 2px;
}

/* ===== Mobile Pager ===== */
.tl-mobile-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-top: 1px solid #f1f5f9;
}

.tl-pager-btn {
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  border: 1px solid #e2e8f0;
  color: #475569;
  background: #fff;
  cursor: pointer;
  transition: background 0.15s;
}

.tl-pager-btn:hover:not(:disabled) {
  background: #f8fafc;
}

.tl-pager-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ===== Responsive ===== */
@media (max-width: 640px) {
  .tl-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .tl-search-wrap {
    max-width: 100%;
  }

  .tl-filter-group {
    align-self: flex-start;
  }
}
</style>

<style>
/* ===== PrimeVue DataTable overrides ===== */
.tl-datatable .p-datatable-thead > tr > th {
  background: #f8fafc !important;
  color: #64748b !important;
  font-weight: 700 !important;
  font-size: 0.72rem !important;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.85rem 1.1rem !important;
  border-bottom: 1px solid #e2e8f0 !important;
  border-top: none !important;
  white-space: nowrap;
}

.tl-datatable .p-datatable-tbody > tr > td {
  padding: 0.9rem 1.1rem !important;
  border-bottom: 1px solid #f1f5f9 !important;
  vertical-align: middle;
}

.tl-datatable .p-datatable-tbody > tr:last-child > td {
  border-bottom: none !important;
}

.tl-datatable .p-datatable-tbody > tr {
  transition: background 0.15s;
}

.tl-datatable .p-datatable-tbody > tr:hover {
  background: #f8fafc !important;
}

/* Paginator */
.tl-datatable .p-paginator {
  background: #fff !important;
  border-top: 1px solid #f1f5f9 !important;
  padding: 0.875rem 1.25rem !important;
  justify-content: space-between !important;
}

.tl-datatable .p-paginator .p-paginator-current {
  font-size: 0.8rem;
  color: #64748b;
}

.tl-datatable .p-paginator .p-paginator-page,
.tl-datatable .p-paginator .p-paginator-next,
.tl-datatable .p-paginator .p-paginator-prev,
.tl-datatable .p-paginator .p-paginator-last,
.tl-datatable .p-paginator .p-paginator-first {
  min-width: 2rem !important;
  height: 2rem !important;
  border-radius: 8px !important;
  font-size: 0.82rem !important;
  color: #475569 !important;
  border: 1px solid transparent !important;
}

.tl-datatable .p-paginator .p-paginator-page.p-highlight {
  background: #6366f1 !important;
  color: #fff !important;
  border-color: #6366f1 !important;
}

.tl-datatable .p-paginator .p-paginator-page:hover:not(.p-highlight),
.tl-datatable .p-paginator .p-paginator-next:hover,
.tl-datatable .p-paginator .p-paginator-prev:hover {
  background: #f1f5f9 !important;
}
</style>