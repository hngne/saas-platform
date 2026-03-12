<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/services/api";
import { useToast } from "primevue/usetoast";

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface TenantDetail {
  id: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
  profile?: {
    store_name: string;
    phone?: string;
    address?: string;
    logo_url?: string;
  };
}

const tenant = ref<TenantDetail | null>(null);
const loading = ref(true);
const actionLoading = ref(false);

const tenantId = computed(() => route.params.id as string);

const fetchTenant = async () => {
  loading.value = true;
  try {
    const { data } = await api.get(`/admin/tenants/${tenantId.value}`);
    tenant.value = data.data;
  } catch {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: "Không tìm thấy tenant",
      life: 3000,
    });
    router.push("/tenants");
  } finally {
    loading.value = false;
  }
};

onMounted(fetchTenant);

const handleBan = async () => {
  actionLoading.value = true;
  try {
    await api.patch(`/admin/tenants/${tenantId.value}/ban`);
    toast.add({
      severity: "success",
      summary: "Thành công",
      detail: "Đã khóa tenant",
      life: 3000,
    });
    await fetchTenant();
  } catch (err: any) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err.response?.data?.message || "Không thể khóa tenant",
      life: 3000,
    });
  } finally {
    actionLoading.value = false;
  }
};

const handleUnban = async () => {
  actionLoading.value = true;
  try {
    await api.patch(`/admin/tenants/${tenantId.value}/unban`);
    toast.add({
      severity: "success",
      summary: "Thành công",
      detail: "Đã mở khóa tenant",
      life: 3000,
    });
    await fetchTenant();
  } catch (err: any) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err.response?.data?.message || "Không thể mở khóa tenant",
      life: 3000,
    });
  } finally {
    actionLoading.value = false;
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
</script>

<template>
  <div class="td-wrapper">

    <!-- Breadcrumb + Page title -->
    <div class="td-page-header">
      <div>
        <div class="td-breadcrumb">
          <span class="td-breadcrumb-link" @click="router.push('/tenants')">Tenants</span>
          <i class="pi pi-angle-right td-breadcrumb-sep"></i>
          <span class="td-breadcrumb-current">Chi tiết Tenant</span>
        </div>
        <h1 class="td-page-title">Chi tiết Tenant</h1>
        <p class="td-page-sub" v-if="tenant">
          Reviewing status and configuration for
          <span class="td-page-sub-name">{{ tenant.profile?.store_name || tenant.slug }}</span>
        </p>
      </div>
      <button class="td-back-btn" @click="router.push('/tenants')">
        <i class="pi pi-arrow-left"></i>
        Quay lại danh sách
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="td-loading">
      <i class="pi pi-spin pi-spinner"></i>
    </div>

    <template v-else-if="tenant">
      <div class="td-layout">

        <!-- ===== CỘT TRÁI: Store card ===== -->
        <div class="td-left-col">
          <div class="td-store-card">

            <!-- Logo / Avatar -->
            <div class="td-logo-wrap">
              <div class="td-logo">
                <img
                  v-if="tenant.profile?.logo_url"
                  :src="tenant.profile.logo_url"
                  :alt="tenant.profile.store_name"
                  class="td-logo-img"
                />
                <i v-else class="pi pi-shopping-bag td-logo-icon"></i>
              </div>
              <span
                class="td-online-dot"
                :class="tenant.status === 'ACTIVE' ? 'td-online-dot--active' : 'td-online-dot--banned'"
              ></span>
            </div>

            <!-- Store name + slug -->
            <h2 class="td-store-name">{{ tenant.profile?.store_name || 'Khách hàng mới' }}</h2>
            <p class="td-store-slug">{{ tenant.slug }}</p>

            <!-- Badges -->
            <div class="td-badge-row">
              <span class="td-badge-type">RETAIL</span>
              <span
                class="td-badge-status"
                :class="tenant.status === 'ACTIVE' ? 'td-badge-status--active' : 'td-badge-status--banned'"
              >
                {{ tenant.status }}
              </span>
            </div>

            <!-- Divider -->
            <div class="td-divider"></div>

            <!-- Meta info -->
            <div class="td-meta-list">
              <div class="td-meta-row">
                <span class="td-meta-label">Joined Date</span>
                <span class="td-meta-value">{{ formatDate(tenant.created_at) }}</span>
              </div>
              <div class="td-meta-row">
                <span class="td-meta-label">Cập nhật</span>
                <span class="td-meta-value">{{ formatDate(tenant.updated_at) }}</span>
              </div>
              <div class="td-meta-row">
                <span class="td-meta-label">Tenant ID</span>
                <span class="td-meta-value td-meta-value--mono">{{ tenant.id.substring(0, 12) }}...</span>
              </div>
            </div>

            <!-- Divider -->
            <div class="td-divider"></div>

            <!-- Action button -->
            <button
              v-if="tenant.status === 'ACTIVE'"
              class="td-action-btn td-action-btn--ban"
              :disabled="actionLoading"
              @click="handleBan"
            >
              <i class="pi pi-ban"></i>
              Khóa Tenant
            </button>
            <button
              v-else
              class="td-action-btn td-action-btn--unban"
              :disabled="actionLoading"
              @click="handleUnban"
            >
              <i class="pi pi-check-circle"></i>
              Kích hoạt Tenant
            </button>

            <!-- Warning text -->
            <p class="td-action-warn" v-if="tenant.status === 'ACTIVE'">
              Hành động này sẽ tắt quyền truy cập ngay lập tức.
            </p>
          </div>
        </div>

        <!-- ===== CỘT PHẢI: Info cards ===== -->
        <div class="td-right-col">

          <!-- Thông tin cửa hàng -->
          <div class="td-info-card" v-if="tenant.profile">
            <div class="td-info-card-header">
              <h3 class="td-info-card-title">Thông tin cửa hàng</h3>
            </div>

            <div class="td-info-grid">
              <div class="td-info-field">
                <span class="td-field-label">TÊN CỬA HÀNG</span>
                <span class="td-field-value">{{ tenant.profile.store_name || '—' }}</span>
              </div>
              <div class="td-info-field" v-if="tenant.profile.phone">
                <span class="td-field-label">SỐ ĐIỆN THOẠI</span>
                <span class="td-field-value">{{ tenant.profile.phone }}</span>
              </div>
              <div class="td-info-field td-info-field--full" v-if="tenant.profile.address">
                <span class="td-field-label">ĐỊA CHỈ</span>
                <span class="td-field-value">{{ tenant.profile.address }}</span>
              </div>
            </div>
          </div>

          <!-- Thông tin hệ thống -->
          <div class="td-info-card">
            <div class="td-info-card-header">
              <h3 class="td-info-card-title">Thông tin hệ thống</h3>
            </div>

            <div class="td-info-grid">
              <div class="td-info-field">
                <span class="td-field-label">DOMAIN / SLUG</span>
                <span class="td-field-value td-field-value--indigo">{{ tenant.slug }}.retail.com</span>
              </div>
              <div class="td-info-field">
                <span class="td-field-label">TRẠNG THÁI</span>
                <span
                  class="td-inline-status"
                  :class="tenant.status === 'ACTIVE' ? 'td-inline-status--active' : 'td-inline-status--banned'"
                >
                  <span class="td-status-dot"></span>
                  {{ tenant.status }}
                </span>
              </div>
              <div class="td-info-field td-info-field--full">
                <span class="td-field-label">TENANT ID</span>
                <span class="td-field-value td-field-value--mono">{{ tenant.id }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ===== Wrapper ===== */
.td-wrapper {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ===== Page Header ===== */
.td-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.td-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}

.td-breadcrumb-link {
  font-size: 0.82rem;
  color: #6366f1;
  cursor: pointer;
  font-weight: 500;
}

.td-breadcrumb-link:hover {
  text-decoration: underline;
}

.td-breadcrumb-sep {
  font-size: 0.7rem;
  color: #94a3b8;
}

.td-breadcrumb-current {
  font-size: 0.82rem;
  color: #64748b;
}

.td-page-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.4px;
  margin: 0 0 0.25rem;
}

.td-page-sub {
  font-size: 0.855rem;
  color: #64748b;
  margin: 0;
}

.td-page-sub-name {
  color: #6366f1;
  font-weight: 600;
}

.td-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.845rem;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
  align-self: flex-start;
  margin-top: 0.25rem;
}

.td-back-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

/* ===== Loading ===== */
.td-loading {
  display: flex;
  justify-content: center;
  padding: 6rem 0;
  color: #6366f1;
  font-size: 2.5rem;
}

/* ===== Layout 2 cột ===== */
.td-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.25rem;
  align-items: start;
}

/* ===== LEFT: Store Card ===== */
.td-store-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 2rem 1.5rem 1.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.td-logo-wrap {
  position: relative;
  margin-bottom: 1.1rem;
}

.td-logo {
  width: 100px;
  height: 100px;
  border-radius: 16px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.td-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.td-logo-icon {
  font-size: 2rem;
  color: #94a3b8;
}

.td-online-dot {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2.5px solid #fff;
}

.td-online-dot--active {
  background: #22c55e;
}

.td-online-dot--banned {
  background: #ef4444;
}

.td-store-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 0.3rem;
  line-height: 1.3;
}

.td-store-slug {
  font-size: 0.78rem;
  color: #94a3b8;
  font-family: ui-monospace, monospace;
  margin: 0 0 0.75rem;
}

.td-badge-row {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  flex-wrap: wrap;
}

.td-badge-type {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 0.25rem 0.65rem;
  border-radius: 99px;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.td-badge-status {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 0.25rem 0.65rem;
  border-radius: 99px;
}

.td-badge-status--active {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.td-badge-status--banned {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.td-divider {
  width: 100%;
  height: 1px;
  background: #f1f5f9;
  margin: 1.1rem 0;
}

/* Meta list */
.td-meta-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.td-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.td-meta-label {
  font-size: 0.8rem;
  color: #94a3b8;
  white-space: nowrap;
}

.td-meta-value {
  font-size: 0.82rem;
  font-weight: 600;
  color: #334155;
  text-align: right;
}

.td-meta-value--mono {
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  color: #64748b;
}

/* Action button */
.td-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  margin-top: 0.25rem;
}

.td-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.td-action-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.td-action-btn--ban {
  background: #ef4444;
  color: #fff;
}

.td-action-btn--ban:hover:not(:disabled) {
  background: #dc2626;
}

.td-action-btn--unban {
  background: #22c55e;
  color: #fff;
}

.td-action-btn--unban:hover:not(:disabled) {
  background: #16a34a;
}

.td-action-warn {
  font-size: 0.72rem;
  color: #94a3b8;
  margin: 0.6rem 0 0;
  font-style: italic;
  line-height: 1.5;
}

/* ===== RIGHT: Info Cards ===== */
.td-right-col {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.td-info-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.td-info-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.td-info-card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

/* Info grid 2 cột trong card */
.td-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem 2rem;
}

.td-info-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.td-info-field--full {
  grid-column: 1 / -1;
}

.td-field-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.7px;
  text-transform: uppercase;
}

.td-field-value {
  font-size: 0.9rem;
  font-weight: 500;
  color: #0f172a;
  line-height: 1.4;
}

.td-field-value--indigo {
  color: #6366f1;
  font-weight: 600;
}

.td-field-value--mono {
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
  color: #475569;
  background: #f8fafc;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  word-break: break-all;
  display: inline-block;
}

/* Inline status */
.td-inline-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  border-radius: 8px;
  width: fit-content;
}

.td-inline-status--active {
  background: #f0fdf4;
  color: #16a34a;
}

.td-inline-status--active .td-status-dot {
  background: #22c55e;
}

.td-inline-status--banned {
  background: #fef2f2;
  color: #dc2626;
}

.td-inline-status--banned .td-status-dot {
  background: #ef4444;
}

.td-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ===== Responsive: Tablet ===== */
@media (max-width: 900px) {
  .td-layout {
    grid-template-columns: 1fr;
  }

  .td-store-card {
    display: grid;
    grid-template-columns: auto 1fr;
    text-align: left;
    gap: 0 1.25rem;
    align-items: start;
  }

  .td-logo-wrap {
    grid-row: 1 / 3;
    margin-bottom: 0;
    align-self: center;
  }

  .td-store-name,
  .td-store-slug,
  .td-badge-row {
    justify-content: flex-start;
  }

  .td-divider {
    grid-column: 1 / -1;
  }

  .td-meta-list,
  .td-action-btn,
  .td-action-warn {
    grid-column: 1 / -1;
  }
}

/* ===== Responsive: Mobile ===== */
@media (max-width: 600px) {
  .td-store-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .td-info-grid {
    grid-template-columns: 1fr;
  }

  .td-info-field--full {
    grid-column: 1;
  }

  .td-page-header {
    flex-direction: column;
  }

  .td-back-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>