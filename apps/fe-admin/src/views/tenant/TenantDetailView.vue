<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/services/api";
import { useToast } from "primevue/usetoast";

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface TenantProfile {
  id: string;
  tenant_id: string;
  owner_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tax_code?: string | null;
  store_name?: string | null;
  store_description?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  banner_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface TenantDetail {
  id: string;
  slug: string;
  business_type: string;
  db_name: string;
  status: "ACTIVE" | "BANNED" | string;
  created_at: string;
  updated_at: string;
  profile?: TenantProfile | null;
}

const tenant = ref<TenantDetail | null>(null);
const loading = ref(true);
const actionLoading = ref(false);

const tenantId = computed(() => route.params.id as string);
const profile = computed(() => tenant.value?.profile ?? null);
const storeName = computed(() => profile.value?.store_name || tenant.value?.slug || "Khách hàng mới");
const storefrontDomain = computed(() => (tenant.value ? `${tenant.value.slug}.retail.com` : ""));
const bannerImages = computed(() => parseBannerImages(profile.value?.banner_url));

const fetchTenant = async () => {
  loading.value = true;
  try {
    const { data } = await api.get(`/admin/tenants/${tenantId.value}`);
    tenant.value = data.data;
  } catch (err: any) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err.response?.data?.message || "Không tìm thấy tenant",
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

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "Chưa có";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const displayValue = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || "Chưa cập nhật";
};

const isEmpty = (value?: string | null) => !value?.trim();

const parseBannerImages = (raw?: string | null) => {
  if (!raw?.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === "string" ? item : item?.image))
        .filter((url): url is string => Boolean(url?.trim()));
    }
  } catch {
    // Merchant settings also supports a plain URL in this DB column.
  }

  return [raw];
};
</script>

<template>
  <div class="td-wrapper">
    <div class="td-page-header">
      <div>
        <div class="td-breadcrumb">
          <button class="td-breadcrumb-link" type="button" @click="router.push('/tenants')">Tenants</button>
          <i class="pi pi-angle-right td-breadcrumb-sep"></i>
          <span class="td-breadcrumb-current">Chi tiết tenant</span>
        </div>
        <h1 class="td-page-title">Chi tiết tenant</h1>
        <p class="td-page-sub" v-if="tenant">
          Theo dõi trạng thái, dữ liệu hệ thống và hồ sơ cửa hàng của
          <span class="td-page-sub-name">{{ storeName }}</span>
        </p>
      </div>
      <button class="td-back-btn" @click="router.push('/tenants')">
        <i class="pi pi-arrow-left"></i>
        Quay lại danh sách
      </button>
    </div>

    <div v-if="loading" class="td-loading">
      <i class="pi pi-spin pi-spinner"></i>
    </div>

    <template v-else-if="tenant">
      <div class="td-layout">
        <aside class="td-left-col">
          <div class="td-store-card">
            <div class="td-logo-wrap">
              <div class="td-logo">
                <img
                  v-if="profile?.logo_url"
                  :src="profile.logo_url"
                  :alt="storeName"
                  class="td-logo-img"
                />
                <i v-else class="pi pi-shopping-bag td-logo-icon"></i>
              </div>
              <span
                class="td-online-dot"
                :class="tenant.status === 'ACTIVE' ? 'td-online-dot--active' : 'td-online-dot--banned'"
              ></span>
            </div>

            <h2 class="td-store-name">{{ storeName }}</h2>
            <p class="td-store-slug">{{ tenant.slug }}</p>

            <div class="td-badge-row">
              <span class="td-badge-type">{{ tenant.business_type }}</span>
              <span
                class="td-badge-status"
                :class="tenant.status === 'ACTIVE' ? 'td-badge-status--active' : 'td-badge-status--banned'"
              >
                {{ tenant.status }}
              </span>
            </div>

            <div class="td-divider"></div>

            <div class="td-meta-list">
              <div class="td-meta-row">
                <span class="td-meta-label">Ngày tạo</span>
                <span class="td-meta-value">{{ formatDateTime(tenant.created_at) }}</span>
              </div>
              <div class="td-meta-row">
                <span class="td-meta-label">Cập nhật</span>
                <span class="td-meta-value">{{ formatDateTime(tenant.updated_at) }}</span>
              </div>
              <div class="td-meta-row">
                <span class="td-meta-label">Tenant ID</span>
                <span class="td-meta-value td-meta-value--mono">{{ tenant.id.substring(0, 12) }}...</span>
              </div>
            </div>

            <div class="td-divider"></div>

            <button
              v-if="tenant.status === 'ACTIVE'"
              class="td-action-btn td-action-btn--ban"
              :disabled="actionLoading"
              @click="handleBan"
            >
              <i class="pi pi-ban"></i>
              Khóa tenant
            </button>
            <button
              v-else
              class="td-action-btn td-action-btn--unban"
              :disabled="actionLoading"
              @click="handleUnban"
            >
              <i class="pi pi-check-circle"></i>
              Kích hoạt tenant
            </button>

            <p class="td-action-warn" v-if="tenant.status === 'ACTIVE'">
              Hành động này sẽ tắt quyền truy cập cửa hàng ngay lập tức.
            </p>
          </div>
        </aside>

        <main class="td-right-col">
          <div class="td-info-card">
            <div class="td-info-card-header">
              <h3 class="td-info-card-title">Thông tin hệ thống</h3>
            </div>

            <div class="td-info-grid">
              <div class="td-info-field">
                <span class="td-field-label">Slug</span>
                <span class="td-field-value td-field-value--indigo">{{ tenant.slug }}</span>
              </div>
              <div class="td-info-field">
                <span class="td-field-label">Domain</span>
                <span class="td-field-value td-field-value--indigo">{{ storefrontDomain }}</span>
              </div>
              <div class="td-info-field">
                <span class="td-field-label">Loại hình</span>
                <span class="td-field-value">{{ tenant.business_type }}</span>
              </div>
              <div class="td-info-field">
                <span class="td-field-label">Trạng thái</span>
                <span
                  class="td-inline-status"
                  :class="tenant.status === 'ACTIVE' ? 'td-inline-status--active' : 'td-inline-status--banned'"
                >
                  <span class="td-status-dot"></span>
                  {{ tenant.status }}
                </span>
              </div>
              <div class="td-info-field td-info-field--full">
                <span class="td-field-label">Database</span>
                <span class="td-field-value td-field-value--mono">{{ tenant.db_name }}</span>
              </div>
              <div class="td-info-field td-info-field--full">
                <span class="td-field-label">Tenant ID</span>
                <span class="td-field-value td-field-value--mono">{{ tenant.id }}</span>
              </div>
            </div>
          </div>

          <div class="td-info-card">
            <div class="td-info-card-header">
              <h3 class="td-info-card-title">Hồ sơ cửa hàng</h3>
              <span v-if="!profile" class="td-muted-chip">Chưa có profile</span>
            </div>

            <div class="td-info-grid">
              <div class="td-info-field">
                <span class="td-field-label">Tên cửa hàng</span>
                <span class="td-field-value" :class="{ 'td-field-value--empty': isEmpty(profile?.store_name) }">
                  {{ displayValue(profile?.store_name) }}
                </span>
              </div>
              <div class="td-info-field">
                <span class="td-field-label">Chủ cửa hàng</span>
                <span class="td-field-value" :class="{ 'td-field-value--empty': isEmpty(profile?.owner_name) }">
                  {{ displayValue(profile?.owner_name) }}
                </span>
              </div>
              <div class="td-info-field">
                <span class="td-field-label">Email</span>
                <span class="td-field-value" :class="{ 'td-field-value--empty': isEmpty(profile?.email) }">
                  {{ displayValue(profile?.email) }}
                </span>
              </div>
              <div class="td-info-field">
                <span class="td-field-label">Số điện thoại</span>
                <span class="td-field-value" :class="{ 'td-field-value--empty': isEmpty(profile?.phone) }">
                  {{ displayValue(profile?.phone) }}
                </span>
              </div>
              <div class="td-info-field">
                <span class="td-field-label">Mã số thuế</span>
                <span class="td-field-value" :class="{ 'td-field-value--empty': isEmpty(profile?.tax_code) }">
                  {{ displayValue(profile?.tax_code) }}
                </span>
              </div>
              <div class="td-info-field">
                <span class="td-field-label">Ngày cập nhật profile</span>
                <span class="td-field-value">{{ formatDateTime(profile?.updated_at) }}</span>
              </div>
              <div class="td-info-field td-info-field--full">
                <span class="td-field-label">Địa chỉ</span>
                <span class="td-field-value" :class="{ 'td-field-value--empty': isEmpty(profile?.address) }">
                  {{ displayValue(profile?.address) }}
                </span>
              </div>
              <div class="td-info-field td-info-field--full">
                <span class="td-field-label">Mô tả cửa hàng</span>
                <span class="td-field-value td-field-value--preline" :class="{ 'td-field-value--empty': isEmpty(profile?.store_description) }">
                  {{ displayValue(profile?.store_description) }}
                </span>
              </div>
            </div>
          </div>

          <div class="td-info-card">
            <div class="td-info-card-header">
              <h3 class="td-info-card-title">Branding & media</h3>
            </div>

            <div class="td-brand-grid">
              <div class="td-brand-field">
                <span class="td-field-label">Logo</span>
                <div class="td-media-box">
                  <img v-if="profile?.logo_url" :src="profile.logo_url" :alt="`${storeName} logo`" />
                  <span v-else>Chưa cập nhật</span>
                </div>
              </div>
              <div class="td-brand-field">
                <span class="td-field-label">Favicon</span>
                <div class="td-media-box td-media-box--small">
                  <img v-if="profile?.favicon_url" :src="profile.favicon_url" alt="Favicon" />
                  <span v-else>Chưa cập nhật</span>
                </div>
              </div>
              <div class="td-brand-field">
                <span class="td-field-label">Màu chính</span>
                <div class="td-color-row">
                  <span class="td-color-swatch" :style="{ background: profile?.primary_color || '#e2e8f0' }"></span>
                  <span class="td-field-value" :class="{ 'td-field-value--empty': isEmpty(profile?.primary_color) }">
                    {{ displayValue(profile?.primary_color) }}
                  </span>
                </div>
              </div>
              <div class="td-brand-field">
                <span class="td-field-label">Màu phụ</span>
                <div class="td-color-row">
                  <span class="td-color-swatch" :style="{ background: profile?.secondary_color || '#e2e8f0' }"></span>
                  <span class="td-field-value" :class="{ 'td-field-value--empty': isEmpty(profile?.secondary_color) }">
                    {{ displayValue(profile?.secondary_color) }}
                  </span>
                </div>
              </div>
              <div class="td-brand-field td-brand-field--full">
                <span class="td-field-label">Banner</span>
                <div v-if="bannerImages.length" class="td-banner-list">
                  <img
                    v-for="(banner, index) in bannerImages"
                    :key="`${banner}-${index}`"
                    :src="banner"
                    :alt="`Banner ${index + 1}`"
                    class="td-banner-img"
                  />
                </div>
                <span v-else class="td-field-value td-field-value--empty">Chưa cập nhật</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </template>
  </div>
</template>

<style scoped>
.td-wrapper {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

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
  border: none;
  background: transparent;
  padding: 0;
  font-size: 0.82rem;
  color: #6366f1;
  cursor: pointer;
  font-weight: 600;
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
  margin: 0 0 0.25rem;
}

.td-page-sub {
  font-size: 0.855rem;
  color: #64748b;
  margin: 0;
  max-width: 720px;
}

.td-page-sub-name {
  color: #6366f1;
  font-weight: 700;
}

.td-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.845rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.td-back-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.td-loading {
  display: flex;
  justify-content: center;
  padding: 6rem 0;
  color: #6366f1;
  font-size: 2.5rem;
}

.td-layout {
  display: grid;
  grid-template-columns: 290px 1fr;
  gap: 1.25rem;
  align-items: start;
}

.td-left-col {
  position: sticky;
  top: 1rem;
}

.td-store-card,
.td-info-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.td-store-card {
  padding: 2rem 1.5rem 1.5rem;
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
  border-radius: 8px;
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
  overflow-wrap: anywhere;
}

.td-store-slug {
  font-size: 0.78rem;
  color: #94a3b8;
  font-family: ui-monospace, monospace;
  margin: 0 0 0.75rem;
  overflow-wrap: anywhere;
}

.td-badge-row {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  flex-wrap: wrap;
}

.td-badge-type,
.td-badge-status {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0.25rem 0.65rem;
  border-radius: 8px;
}

.td-badge-type {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
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

.td-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
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
  line-height: 1.5;
}

.td-right-col {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.td-info-card {
  padding: 1.5rem;
}

.td-info-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.td-info-card-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.td-muted-chip {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.25rem 0.55rem;
}

.td-info-grid,
.td-brand-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem 2rem;
}

.td-info-field,
.td-brand-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.td-info-field--full,
.td-brand-field--full {
  grid-column: 1 / -1;
}

.td-field-label {
  font-size: 0.68rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
}

.td-field-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.td-field-value--empty {
  color: #94a3b8;
  font-weight: 500;
}

.td-field-value--indigo {
  color: #6366f1;
  font-weight: 700;
}

.td-field-value--mono {
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
  color: #475569;
  background: #f8fafc;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  word-break: break-all;
  display: inline-block;
}

.td-field-value--preline {
  white-space: pre-line;
}

.td-inline-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 800;
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

.td-media-box {
  width: 100%;
  height: 96px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 0.82rem;
  overflow: hidden;
}

.td-media-box--small {
  width: 96px;
}

.td-media-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.td-color-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.td-color-swatch {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  flex-shrink: 0;
}

.td-banner-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}

.td-banner-img {
  width: 100%;
  aspect-ratio: 16 / 7;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

@media (max-width: 900px) {
  .td-layout {
    grid-template-columns: 1fr;
  }

  .td-left-col {
    position: static;
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

  .td-badge-row {
    justify-content: flex-start;
  }

  .td-divider,
  .td-meta-list,
  .td-action-btn,
  .td-action-warn {
    grid-column: 1 / -1;
  }
}

@media (max-width: 600px) {
  .td-store-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .td-info-grid,
  .td-brand-grid {
    grid-template-columns: 1fr;
  }

  .td-info-field--full,
  .td-brand-field--full {
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
