<script setup lang="ts">
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

const getInitials = (name?: string): string => {
  if (!name) return "A";
  const parts = name.trim().split(" ").filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase() || "A";
};

const formatMemberSince = (dateStr?: string) => {
  const d = new Date(dateStr || Date.now());
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};
</script>

<template>
  <div class="ap-wrapper">

    <h1 class="ap-page-title">Thông tin tài khoản</h1>

    <div class="ap-card">

      <!-- Banner gradient -->
      <div class="ap-banner"></div>

      <!-- Avatar nổi trên banner -->
      <div class="ap-avatar-wrap">
        <div class="ap-avatar">
          {{ getInitials(authStore.admin?.name) }}
        </div>
      </div>

      <!-- Nội dung -->
      <div class="ap-content">
        <h2 class="ap-name">{{ authStore.admin?.name || 'Super Admin' }}</h2>
        <p class="ap-email">{{ authStore.admin?.email || 'admin@example.com' }}</p>

        <!-- Badges -->
        <div class="ap-badge-row">
          <span class="ap-badge ap-badge--admin">
            <i class="pi pi-shield"></i>
            ADMIN
          </span>
          <span class="ap-badge ap-badge--active">
            <i class="pi pi-check-circle"></i>
            ACTIVE
          </span>
        </div>

        <div class="ap-divider"></div>

        <p class="ap-member-since">
          Thành viên từ: {{ formatMemberSince(authStore.admin?.created_at) }}
        </p>

        <!-- Logout -->
        <button
          class="ap-logout-btn"
          @click="authStore.logout(); router.push('/login')"
        >
          <span class="ap-logout-arrow">→</span>
          Đăng xuất
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.ap-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 1rem 1rem 4rem;
}

.ap-page-title {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
  margin: 0;
  text-align: center;
}

/* ===== Card ===== */
.ap-card {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.09);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ===== Banner ===== */
.ap-banner {
  width: 100%;
  height: 128px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  flex-shrink: 0;
}

/* ===== Avatar ===== */
.ap-avatar-wrap {
  margin-top: -52px;
  z-index: 1;
}

.ap-avatar {
  width: 104px;
  height: 104px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -1px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid #fff;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.35);
}

/* ===== Content ===== */
.ap-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.25rem 2rem 2rem;
}

.ap-name {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0.75rem 0 0.3rem;
  text-align: center;
}

.ap-email {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 1.25rem;
  text-align: center;
}

/* ===== Badges ===== */
.ap-badge-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 1.75rem;
}

.ap-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.9rem;
  border-radius: 99px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.ap-badge i {
  font-size: 0.78rem;
}

.ap-badge--admin {
  background: #eef2ff;
  color: #6366f1;
  border: 1px solid #c7d2fe;
}

.ap-badge--active {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

/* ===== Divider ===== */
.ap-divider {
  width: 100%;
  height: 1px;
  background: #f1f5f9;
  margin-bottom: 1.25rem;
}

/* ===== Member since ===== */
.ap-member-since {
  font-size: 0.855rem;
  color: #64748b;
  margin: 0 0 1.5rem;
  text-align: center;
}

/* ===== Logout button ===== */
.ap-logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.ap-logout-btn:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.ap-logout-arrow {
  font-size: 1rem;
}

/* ===== Responsive ===== */
@media (max-width: 520px) {
  .ap-card {
    border-radius: 16px;
    max-width: 100%;
  }

  .ap-content {
    padding: 1.25rem 1.25rem 1.5rem;
  }

  .ap-page-title {
    font-size: 1.6rem;
  }
}
</style>