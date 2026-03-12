<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import Chart from "primevue/chart";

const authStore = useAuthStore();

interface Stats {
  total: number;
  active: number;
  banned: number;
  newThisMonth: number;
  chartData: Array<{ month: string; count: number }>;
}

const stats = ref<Stats | null>(null);
const loading = ref(true);
const chartData = ref();
const chartOptions = ref();

const setChartData = (data: Array<{ month: string; count: number }>) => ({
  labels: data.map((d) => d.month),
  datasets: [
    {
      label: "Tenant đăng ký mới",
      data: data.map((d) => d.count),
      backgroundColor: "rgba(79, 70, 229, 0.12)",
      borderColor: "#4f46e5",
      borderWidth: 2.5,
      fill: true,
      tension: 0.45,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: "#4f46e5",
    },
  ],
});

const setChartOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index" as const, intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1e1b4b",
      titleColor: "#a5b4fc",
      bodyColor: "#e0e7ff",
      padding: 12,
      cornerRadius: 10,
      displayColors: true,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: "#94a3b8", font: { size: 11 } },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: "rgba(0,0,0,0.05)", drawTicks: false },
      ticks: {
        stepSize: 1,
        color: "#94a3b8",
        font: { size: 11 },
        padding: 8,
      },
    },
  },
});

onMounted(async () => {
  try {
    const { data } = await api.get("/admin/stats");
    stats.value = data.data;
    if (stats.value?.chartData) {
      chartData.value = setChartData(stats.value.chartData);
      chartOptions.value = setChartOptions();
    }
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false;
  }
});

const statCards = [
  { key: "total",        label: "Tổng cửa hàng",   icon: "pi pi-building",     color: "#6366f1", bg: "rgba(99,102,241,0.1)"  },
  { key: "active",       label: "Đang hoạt động",  icon: "pi pi-check-circle", color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  { key: "banned",       label: "Đã bị khóa",      icon: "pi pi-ban",          color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  { key: "newThisMonth", label: "Mới trong tháng", icon: "pi pi-star",         color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
];

const getAdminInitials = () => {
  const name = authStore.admin?.name || "A";
  return name.split(" ").filter(Boolean).slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
};
</script>

<template>
  <div class="dash">

    <!-- Tiêu đề -->
    <div class="dash-heading">
      <h1 class="dash-title">Xin chào, {{ authStore.admin?.name?.split(" ")[0] || "Admin" }} 👋</h1>
      <p class="dash-subtitle">Đây là tổng quan mới nhất của hệ thống bán lẻ.</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="dash-loading">
      <i class="pi pi-spin pi-spinner"></i>
    </div>

    <template v-else-if="stats">

      <!-- Stat Cards -->
      <div class="stat-grid">
        <div v-for="card in statCards" :key="card.key" class="stat-card">
          <div class="stat-icon-wrap" :style="{ background: card.bg, color: card.color }">
            <i :class="card.icon"></i>
          </div>
          <p class="stat-label">{{ card.label }}</p>
          <p class="stat-value">{{ (stats as any)[card.key]?.toLocaleString() }}</p>
        </div>
      </div>

      <!-- Middle: Chart + Admin -->
      <div class="middle-row">

        <!-- Chart -->
        <div class="chart-card">
          <div class="chart-card-header">
            <h3 class="chart-card-title">Tăng trưởng Tenant</h3>
            <span class="chart-card-sub">6 tháng gần nhất</span>
          </div>
          <div class="chart-body">
            <Chart type="line" :data="chartData" :options="chartOptions" class="h-full w-full" />
          </div>
        </div>

        <!-- Admin Info -->
        <div class="admin-card">
          <p class="admin-card-label">Thông tin Admin</p>

          <div class="admin-avatar-wrap">
            <div class="admin-avatar">{{ getAdminInitials() }}</div>
            <span class="admin-dot"></span>
          </div>

          <h4 class="admin-name">{{ authStore.admin?.name || "Super Admin" }}</h4>
          <p class="admin-email">{{ authStore.admin?.email || "admin@example.com" }}</p>

          <div class="admin-badges">
            <span class="badge badge-indigo">ADMIN</span>
            <span class="badge badge-green">ACTIVE</span>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<style scoped>
/* ===== Wrapper ===== */
.dash {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

/* ===== Heading ===== */
.dash-heading {
  padding-bottom: 0.25rem;
}

.dash-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.dash-subtitle {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.3rem;
}

/* ===== Loading ===== */
.dash-loading {
  display: flex;
  justify-content: center;
  padding: 6rem 0;
  color: #4f46e5;
  font-size: 2.5rem;
}

/* ===== Stat Grid ===== */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.4rem 1.5rem 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: default;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.08);
}

.stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  margin-bottom: 1.1rem;
}

.stat-label {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 0.4rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
  line-height: 1;
}

/* ===== Middle Row ===== */
.middle-row {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1rem;
  align-items: stretch;
  min-width: 0; /* fix grid overflow ngang */
}

/* ===== Chart Card ===== */
.chart-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;     /* QUAN TRỌNG: fix grid child overflow */
  overflow: hidden; /* chặn chart con tràn ra ngoài card */
}

.chart-card-header {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.chart-card-title {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.chart-card-sub {
  font-size: 0.78rem;
  color: #94a3b8;
}

.chart-body {
  flex: 1;
  height: 320px;
  position: relative;
  width: 100%;
  overflow: hidden; /* chặn chart tràn ngang */
  min-width: 0;     /* fix flexbox child overflow */
}

/* ===== Admin Card ===== */
.admin-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.admin-card-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
  align-self: flex-start;
  margin-bottom: 1.5rem;
}

.admin-avatar-wrap {
  position: relative;
  margin-bottom: 1rem;
}

.admin-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 1.6rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(99,102,241,0.3);
}

.admin-dot {
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 14px;
  height: 14px;
  background: #22c55e;
  border-radius: 50%;
  border: 2.5px solid #fff;
}

.admin-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.3rem;
}

.admin-email {
  font-size: 0.78rem;
  color: #94a3b8;
  margin-bottom: 1.25rem;
  word-break: break-all;
}

.admin-badges {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  letter-spacing: 0.6px;
}

.badge-indigo {
  background: #eef2ff;
  color: #4f46e5;
}

.badge-green {
  background: #f0fdf4;
  color: #16a34a;
}

/* ===== Responsive: Tablet ≤ 1024px ===== */
@media (max-width: 1024px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .middle-row {
    grid-template-columns: 1fr;
  }

  .chart-body {
    height: 240px;
  }

  .admin-card {
    flex-direction: row;
    text-align: left;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  .admin-card-label {
    width: 100%;
    margin-bottom: 0;
  }

  .admin-avatar-wrap {
    margin-bottom: 0;
  }

  .admin-name,
  .admin-email,
  .admin-badges {
    text-align: left;
    justify-content: flex-start;
  }
}

/* ===== Responsive: Mobile ≤ 640px ===== */
@media (max-width: 640px) {
  .dash-title {
    font-size: 1.4rem;
  }

  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .stat-card {
    padding: 1rem 1.1rem 1.1rem;
  }

  .stat-value {
    font-size: 1.6rem;
  }

  .chart-body {
    height: 200px;
  }

  .admin-card {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }

  .admin-name,
  .admin-email,
  .admin-badges {
    text-align: center;
    justify-content: center;
  }

  .admin-avatar-wrap {
    margin-bottom: 0.75rem;
  }
}
</style>