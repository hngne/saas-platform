<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { settingsService, type ShopSettings } from '@/services/settings.service'
import { useAppToast } from '@/composables/useToast'
import api from '@/services/api'
import { computed } from 'vue'

const toast = useAppToast()
const loading = ref(true)
const saving = ref(false)
const activeTab = ref<'info' | 'branding'>('info')

// Defaults từ theme fe-customer
const DEFAULT_PRIMARY = '#a44308'
const DEFAULT_ACCENT = '#ef4b14'

const form = reactive<ShopSettings>({
  slug: '',
  business_type: '',
  store_name: '',
  store_description: '',
  owner_name: '',
  phone: '',
  email: '',
  address: '',
  tax_code: '',
  logo_url: '',
  favicon_url: '',
  primary_color: '',
  secondary_color: '',
  banner_url: '',
})

const uploading = reactive<Record<string, boolean>>({
  logo: false,
  favicon: false,
  banner: false,
})

interface BannerConfig {
  image: string
  href: string
}

// Computed: color picker value (never empty → avoids #000000)
const primaryColorValue = computed({
  get: () => form.primary_color || DEFAULT_PRIMARY,
  set: (v: string) => { form.primary_color = v },
})
const accentColorValue = computed({
  get: () => form.secondary_color || DEFAULT_ACCENT,
  set: (v: string) => { form.secondary_color = v },
})

// Banner: hỗ trợ nhiều ảnh (lưu JSON array trong banner_url)
const normalizeBanner = (value: unknown): BannerConfig | null => {
  if (typeof value === 'string') {
    const image = value.trim()
    return image ? { image, href: '' } : null
  }

  if (!value || typeof value !== 'object') return null

  const item = value as { image?: unknown; url?: unknown; href?: unknown; link?: unknown }
  const image = String(item.image || item.url || '').trim()
  const href = String(item.href || item.link || '').trim()
  return image ? { image, href } : null
}

const bannerItems = computed<BannerConfig[]>({
  get: () => {
    if (!form.banner_url) return []
    try {
      const parsed = JSON.parse(form.banner_url)
      const rawItems = Array.isArray(parsed) ? parsed : [parsed]
      return rawItems
        .map(normalizeBanner)
        .filter((item): item is BannerConfig => Boolean(item))
    } catch {
      return form.banner_url ? [{ image: form.banner_url, href: '' }] : []
    }
  },
  set: (arr: BannerConfig[]) => {
    form.banner_url = arr.length ? JSON.stringify(arr) : ''
  },
})

const removeBanner = (index: number) => {
  const copy = [...bannerItems.value]
  copy.splice(index, 1)
  bannerItems.value = copy
}

const updateBannerHref = (index: number, href: string) => {
  const copy = bannerItems.value.map((item) => ({ ...item }))
  if (!copy[index]) return
  copy[index].href = href
  bannerItems.value = copy
}

const loadSettings = async () => {
  loading.value = true
  try {
    const data = await settingsService.get()
    Object.assign(form, data)
  } catch {
    toast.error('Lỗi', 'Không thể tải cài đặt.')
  } finally {
    loading.value = false
  }
}

const uploadImage = async (file: File, field: 'logo_url' | 'favicon_url' | 'banner_url') => {
  const key = field.replace('_url', '') as 'logo' | 'favicon' | 'banner'
  uploading[key] = true
  try {
    const formData = new FormData()
    formData.append('image', file)
    const { data } = await api.post('/upload/store', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const url = data.data?.url || data.data?.image_url || data.url
    if (url) {
      if (field === 'banner_url') {
        // Banner: thêm vào mảng
        bannerItems.value = [...bannerItems.value, { image: url, href: '' }]
      } else {
        form[field] = url
      }
      toast.success('Thành công', 'Đã tải ảnh lên.')
    }
  } catch {
    toast.error('Lỗi', 'Không thể tải ảnh lên.')
  } finally {
    uploading[key] = false
  }
}

const handleFileSelect = (event: Event, field: 'logo_url' | 'favicon_url' | 'banner_url') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    uploadImage(file, field)
  }
  input.value = '' // reset để chọn lại cùng file
}

const saveSettings = async () => {
  saving.value = true
  try {
    const { slug, business_type, ...updatable } = form
    await settingsService.update(updatable)
    toast.success('Thành công', 'Đã lưu cài đặt cửa hàng.')
  } catch {
    toast.error('Lỗi', 'Không thể lưu cài đặt.')
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="settings-page">
    <div class="settings-page-head">
      <p class="page-section-label">CÀI ĐẶT CỬA HÀNG</p>
      <p class="page-section-sub">Quản lý thông tin và giao diện website bán hàng của bạn</p>
    </div>

    <!-- Tabs -->
    <div class="settings-tabs">
      <button :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">
        <i class="pi pi-shop"></i> Thông tin Shop
      </button>
      <button :class="{ active: activeTab === 'branding' }" @click="activeTab = 'branding'">
        <i class="pi pi-palette"></i> Tùy chỉnh Website
      </button>
    </div>

    <div v-if="loading" class="settings-loading">
      <i class="pi pi-spin pi-spinner"></i> Đang tải...
    </div>

    <!-- Tab: Thông tin Shop -->
    <div v-else-if="activeTab === 'info'" class="app-card settings-card fade-in-up">
      <div class="settings-header">
        <div class="settings-icon info">
          <i class="pi pi-shop"></i>
        </div>
        <div>
          <h2>Thông tin cửa hàng</h2>
          <p>Cập nhật thông tin hiển thị trên website bán hàng</p>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group readonly">
          <label>Slug / Domain</label>
          <input :value="form.slug" disabled />
        </div>
        <div class="form-group readonly">
          <label>Loại hình kinh doanh</label>
          <input :value="form.business_type" disabled />
        </div>
        <div class="form-group">
          <label>Tên cửa hàng <span class="required">*</span></label>
          <input v-model="form.store_name" placeholder="Nhập tên cửa hàng" />
        </div>
        <div class="form-group">
          <label>Chủ cửa hàng</label>
          <input v-model="form.owner_name" placeholder="Tên chủ shop" />
        </div>
        <div class="form-group">
          <label>Số điện thoại</label>
          <input v-model="form.phone" placeholder="0912 345 678" />
        </div>
        <div class="form-group">
          <label>Email liên hệ</label>
          <input v-model="form.email" type="email" placeholder="shop@email.com" />
        </div>
        <div class="form-group full">
          <label>Địa chỉ</label>
          <input v-model="form.address" placeholder="Số nhà, đường, quận, thành phố..." />
        </div>
        <div class="form-group">
          <label>Mã số thuế</label>
          <input v-model="form.tax_code" placeholder="MST (nếu có)" />
        </div>
        <div class="form-group full">
          <label>Mô tả cửa hàng</label>
          <textarea v-model="form.store_description" rows="3" placeholder="Giới thiệu ngắn về shop..."></textarea>
        </div>
      </div>

      <div class="form-actions">
        <button class="btn-save" :disabled="saving" @click="saveSettings">
          <i class="pi" :class="saving ? 'pi-spin pi-spinner' : 'pi-check'"></i>
          {{ saving ? 'Đang lưu...' : 'Lưu thay đổi' }}
        </button>
      </div>
    </div>

    <!-- Tab: Tùy chỉnh Website -->
    <div v-else-if="activeTab === 'branding'" class="app-card settings-card fade-in-up">
      <div class="settings-header">
        <div class="settings-icon branding">
          <i class="pi pi-palette"></i>
        </div>
        <div>
          <h2>Tùy chỉnh giao diện</h2>
          <p>Thay đổi màu sắc, logo, banner trên trang bán hàng — áp dụng ngay cho khách hàng</p>
        </div>
      </div>

      <!-- Logo Upload -->
      <div class="upload-section">
        <div class="upload-row">
          <div class="upload-info">
            <h3>Logo cửa hàng</h3>
            <p>Hiển thị trên header website. Khuyến nghị: 200×60px, PNG hoặc SVG</p>
            <label class="upload-btn" :class="{ disabled: uploading.logo }">
              <i class="pi" :class="uploading.logo ? 'pi-spin pi-spinner' : 'pi-upload'"></i>
              {{ uploading.logo ? 'Đang tải...' : 'Chọn ảnh' }}
              <input type="file" accept="image/*" hidden @change="handleFileSelect($event, 'logo_url')" />
            </label>
          </div>
          <div class="upload-preview logo-preview">
            <img v-if="form.logo_url" :src="form.logo_url" alt="Logo" />
            <div v-else class="preview-empty"><i class="pi pi-image"></i><span>Chưa có logo</span></div>
          </div>
        </div>
      </div>

      <!-- Favicon Upload -->
      <div class="upload-section">
        <div class="upload-row">
          <div class="upload-info">
            <h3>Favicon</h3>
            <p>Icon hiển thị trên tab trình duyệt. Khuyến nghị: 32×32px</p>
            <label class="upload-btn" :class="{ disabled: uploading.favicon }">
              <i class="pi" :class="uploading.favicon ? 'pi-spin pi-spinner' : 'pi-upload'"></i>
              {{ uploading.favicon ? 'Đang tải...' : 'Chọn ảnh' }}
              <input type="file" accept="image/*" hidden @change="handleFileSelect($event, 'favicon_url')" />
            </label>
          </div>
          <div class="upload-preview favicon-preview">
            <img v-if="form.favicon_url" :src="form.favicon_url" alt="Favicon" />
            <div v-else class="preview-empty small"><i class="pi pi-image"></i></div>
          </div>
        </div>
      </div>

      <!-- Banner Upload (nhiều ảnh) -->
      <div class="upload-section">
        <div class="upload-row banner-row">
          <div class="upload-info">
            <h3>Banner trang chủ <span class="banner-count">{{ bannerItems.length }} ảnh</span></h3>
            <p>Ảnh lớn hiển thị trên hero section (slider). Khuyến nghị: 1920×600px. Có thể thêm nhiều ảnh.</p>
            <label class="upload-btn" :class="{ disabled: uploading.banner }">
              <i class="pi" :class="uploading.banner ? 'pi-spin pi-spinner' : 'pi-plus'"></i>
              {{ uploading.banner ? 'Đang tải...' : 'Thêm ảnh banner' }}
              <input type="file" accept="image/*" hidden @change="handleFileSelect($event, 'banner_url')" />
            </label>
          </div>
        </div>
        <div v-if="bannerItems.length" class="banner-grid">
          <div v-for="(banner, idx) in bannerItems" :key="`${banner.image}-${idx}`" class="banner-item">
            <img :src="banner.image" alt="Banner" />
            <button type="button" class="banner-remove" @click="removeBanner(idx)">
              <i class="pi pi-times"></i>
            </button>
            <span class="banner-order">{{ idx + 1 }}</span>
            <div class="banner-link-field">
              <label>Link khi click</label>
              <input
                :value="banner.href"
                placeholder="/products hoặc /categories/ao-nam"
                @input="updateBannerHref(idx, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </div>
        <div v-else class="banner-preview-wide empty">
          <i class="pi pi-images"></i>
          <span>Chưa có banner — Thêm ảnh cho slider trang chủ</span>
        </div>
      </div>

      <!-- Colors -->
      <div class="color-section">
        <h3>Bảng màu thương hiệu</h3>
        <p class="color-hint">Màu mặc định lấy từ theme hiện tại. Thay đổi sẽ áp dụng ngay cho website khách hàng.</p>
        <div class="color-grid">
          <div class="color-card">
            <label>Màu chủ đạo (Primary)</label>
            <div class="color-picker-row">
              <input v-model="primaryColorValue" type="color" class="color-input" />
              <input v-model="primaryColorValue" :placeholder="DEFAULT_PRIMARY" class="color-text" />
            </div>
            <div class="color-demo" :style="{ background: primaryColorValue }">
              <span>Nút bấm / Link</span>
            </div>
          </div>
          <div class="color-card">
            <label>Màu phụ (Accent)</label>
            <div class="color-picker-row">
              <input v-model="accentColorValue" type="color" class="color-input" />
              <input v-model="accentColorValue" :placeholder="DEFAULT_ACCENT" class="color-text" />
            </div>
            <div class="color-demo" :style="{ background: accentColorValue }">
              <span>Badge / Accent</span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button class="btn-save" :disabled="saving" @click="saveSettings">
          <i class="pi" :class="saving ? 'pi-spin pi-spinner' : 'pi-check'"></i>
          {{ saving ? 'Đang lưu...' : 'Lưu thay đổi' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 100%;
}

.settings-page-head {
  margin-bottom: 20px;
}

.page-section-sub {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.settings-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.settings-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.15s;
}

.settings-tabs button:hover {
  color: var(--text-primary);
  border-color: var(--primary);
}

.settings-tabs button.active {
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(255, 107, 43, 0.25);
}

.settings-loading {
  padding: 60px;
  text-align: center;
  color: var(--text-muted);
  font-weight: 600;
}

.settings-card {
  padding: 28px;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.settings-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.3rem;
  flex-shrink: 0;
}

.settings-icon.info {
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
}

.settings-icon.branding {
  background: linear-gradient(135deg, #8B5CF6, #EC4899);
}

.settings-header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.settings-header p {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--text-muted);
}

/* ── Form Grid ──────────────────── */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.required {
  color: #ef4444;
}

.form-group input,
.form-group textarea {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 0.88rem;
  color: var(--text-primary);
  background: #fff;
  transition: border-color 0.15s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255, 107, 43, 0.1);
}

.form-group.readonly input {
  background: #f8fafc;
  color: var(--text-muted);
  cursor: not-allowed;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

/* ── Upload Section ─────────────── */
.upload-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f1f5f9;
}

.upload-row {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.upload-info {
  flex: 1;
}

.upload-info h3 {
  margin: 0 0 6px;
  font-size: 0.95rem;
  font-weight: 700;
}

.upload-info p {
  margin: 0 0 14px;
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: #f8fafc;
  color: var(--primary);
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s;
}

.upload-btn:hover {
  border-color: var(--primary);
  background: #fff3ed;
}

.upload-btn.disabled {
  opacity: 0.6;
  cursor: wait;
}

.upload-preview {
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

.logo-preview {
  width: 160px;
  height: 80px;
}

.favicon-preview {
  width: 64px;
  height: 64px;
}

.upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px;
}

.banner-count {
  font-size: 0.75rem;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 6px;
  color: var(--text-muted);
  margin-left: 8px;
  font-weight: 500;
}

.banner-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.banner-item {
  position: relative;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #fff;
  overflow: hidden;
}

.banner-item img {
  width: 100%;
  aspect-ratio: 16/6;
  object-fit: cover;
  display: block;
  background: #f8fafc;
}

.banner-link-field {
  display: grid;
  gap: 6px;
  padding: 10px;
  border-top: 1px solid var(--border);
}

.banner-link-field label {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.banner-link-field input {
  min-height: 38px;
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 8px 10px;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.banner-link-field input:focus {
  outline: none;
  border-color: #ff6b2b;
  box-shadow: 0 0 0 3px rgba(255, 107, 43, 0.1);
}

.banner-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.banner-remove:hover {
  background: #ef4444;
  color: #fff;
  transform: scale(1.1);
}

.banner-order {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-light);
  font-size: 0.72rem;
}

.preview-empty i {
  font-size: 1.2rem;
}

.preview-empty.small {
  font-size: 0;
}

.preview-empty.small i {
  font-size: 1rem;
}

/* Banner wide */
.banner-preview-wide {
  margin-top: 14px;
  width: 100%;
  height: 180px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #f8fafc;
}

.banner-preview-wide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-preview-wide.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-light);
}

.banner-preview-wide.empty i {
  font-size: 2rem;
}

.banner-preview-wide.empty span {
  font-size: 0.82rem;
}

/* ── Colors ──────────────────────── */
.color-section {
  margin-bottom: 24px;
}

.color-section h3 {
  margin: 0 0 4px;
  font-size: 0.95rem;
  font-weight: 700;
}

.color-hint {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.color-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.color-card {
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fafbfc;
}

.color-card label {
  display: block;
  margin-bottom: 10px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.color-picker-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.color-input {
  width: 44px;
  height: 44px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  flex-shrink: 0;
}

.color-text {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 0.88rem;
  color: var(--text-primary);
}

.color-text:focus {
  outline: none;
  border-color: var(--primary);
}

.color-demo {
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.82rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* ── Actions ─────────────────────── */
.form-actions {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
}

.btn-save {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #FF6B2B, #FFD700);
  color: #fff;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(255, 107, 43, 0.25);
  transition: all 0.2s;
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 107, 43, 0.3);
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: wait;
  transform: none;
}

/* ── Responsive ──────────────────── */
@media (max-width: 768px) {
  .settings-card {
    padding: 18px;
  }

  .settings-tabs {
    flex-wrap: wrap;
  }

  .form-grid,
  .color-grid {
    grid-template-columns: 1fr;
  }

  .upload-row {
    flex-direction: column;
  }

  .logo-preview {
    width: 100%;
    height: 100px;
  }

  .favicon-preview {
    width: 64px;
    height: 64px;
  }

  .banner-preview-wide {
    height: 140px;
  }

  .settings-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .settings-card {
    padding: 22px;
  }
}
</style>
