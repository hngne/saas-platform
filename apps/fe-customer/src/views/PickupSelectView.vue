<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, Check, Clock3, Filter, MapPin, Minus, Navigation, Phone, Plus, Search, Store } from "lucide-vue-next";
import { checkoutApi, type StoreLocation } from "@/api/customer";

const router = useRouter();
const search = ref("");
const stores = ref<StoreLocation[]>([]);
const selectedId = ref("");
const geoLoading = ref(false);
const hasGeoSorted = ref(false);

const storeOptions = computed(() => {
  const source = stores.value.map((store) => ({
    id: store.id,
    name: store.name,
    address: store.address,
    phone: store.phone || "Đang cập nhật",
    hours: store.open_time && store.close_time ? `${store.open_time} - ${store.close_time}` : "08:00 - 22:00",
    status: store.is_active === false ? "CLOSED" : "OPEN",
    distance: store.distance_km != null ? `${store.distance_km} km` : "—",
    distance_km: store.distance_km,
  }));

  const keyword = search.value.trim().toLowerCase();
  return source
    .filter((store) => !keyword || store.name.toLowerCase().includes(keyword) || store.address.toLowerCase().includes(keyword))
    .map((store, index) => ({
      ...store,
      selected: selectedId.value ? store.id === selectedId.value : index === 0,
    }));
});

const selectedStore = computed(() => storeOptions.value.find((store) => store.selected) || storeOptions.value[0]);

const chooseStore = (id: string) => {
  selectedId.value = id;
};

const confirmPickup = async () => {
  if (!selectedStore.value) return;
  localStorage.setItem("selected_pickup_store", JSON.stringify(selectedStore.value));
  await router.push("/checkout");
};

/** Sắp xếp cửa hàng theo khoảng cách GPS của khách */
const sortByMyLocation = async () => {
  if (!navigator.geolocation) return;
  geoLoading.value = true;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }),
    );
    const data = await checkoutApi.getNearestStores(pos.coords.latitude, pos.coords.longitude);
    stores.value = data;
    hasGeoSorted.value = true;
    if (data.length) selectedId.value = data[0]!.id;
  } catch {
    // Fallback: keep existing order
  } finally {
    geoLoading.value = false;
  }
};

onMounted(async () => {
  const data = await checkoutApi.getStores().catch(() => []);
  stores.value = data;
  selectedId.value = data[0]?.id || "";
});
</script>

<template>
  <section class="pickup-page">
    <header class="pickup-mobile-head">
      <RouterLink to="/checkout" aria-label="Quay lại"><ArrowLeft :size="28" /></RouterLink>
      <h1>Chọn điểm nhận hàng</h1>
      <span></span>
    </header>

    <div class="sf-container pickup-shell">
      <nav class="pickup-breadcrumb">Trang chủ › Thanh toán › Chọn điểm nhận hàng</nav>
      <h1>Chọn điểm nhận hàng tại cửa hàng</h1>

      <div class="pickup-layout">
        <aside class="store-panel">
          <div class="store-filter">
            <label class="search-field">
              <Search :size="22" />
              <input v-model="search" placeholder="Tìm theo quận, huyện, tỉnh thành" />
            </label>
            <div class="filter-row">
              <select><option>Tỉnh/Thành phố</option></select>
              <label><input type="checkbox" /> Đang mở cửa</label>
            </div>
          </div>

          <div class="mobile-filter-row">
            <label><Search :size="20" /><input v-model="search" placeholder="Tìm theo địa chỉ, khu vực..." /></label>
            <button type="button" aria-label="Bộ lọc"><Filter :size="20" /></button>
          </div>
          <div class="mobile-chips">
            <button type="button" class="active"><Check :size="16" /> Đang mở cửa</button>
            <button type="button" :class="{ active: hasGeoSorted }" :disabled="geoLoading" @click="sortByMyLocation">
              <Navigation v-if="!geoLoading" :size="16" />
              {{ geoLoading ? "Đang định vị..." : "Gần tôi nhất" }}
            </button>
          </div>

          <div v-if="storeOptions.length" class="store-list">
            <article v-for="storeItem in storeOptions" :key="storeItem.id" class="store-card" :class="{ selected: storeItem.selected, closed: storeItem.status === 'CLOSED' }">
              <div class="store-status">
                <span :class="storeItem.status.toLowerCase()">{{ storeItem.status === "OPEN" ? "Mở cửa" : "Đóng cửa" }}</span>
                <small><MapPin :size="15" /> {{ storeItem.distance }}</small>
              </div>
              <h2>{{ storeItem.name }}</h2>
              <p><MapPin :size="17" /> {{ storeItem.address }}</p>
              <p><Phone :size="17" /> {{ storeItem.phone }} <Clock3 :size="17" /> {{ storeItem.hours }}</p>
              <div class="store-actions">
                <a>Xem bản đồ →</a>
                <button type="button" :disabled="storeItem.status === 'CLOSED'" @click="chooseStore(storeItem.id)">
                  <Check v-if="storeItem.selected" :size="17" />
                  {{ storeItem.selected ? "Đã chọn" : "Chọn" }}
                </button>
              </div>
            </article>
          </div>
          <div v-else class="store-empty">
            <h2>Chưa có điểm nhận hàng</h2>
            <p>Shop hiện tại chưa cấu hình cửa hàng active để khách chọn nhận tại điểm bán.</p>
          </div>
        </aside>

        <section class="map-panel" aria-label="Bản đồ cửa hàng">
          <div class="map-shape">
            <span class="pin pin-main"><Store :size="24" /></span>
            <span class="pin pin-secondary"></span>
            <strong>{{ selectedStore?.name || "The Merchant" }}</strong>
          </div>
          <div class="map-controls">
            <button type="button" aria-label="Phóng to"><Plus :size="28" /></button>
            <button type="button" aria-label="Thu nhỏ"><Minus :size="28" /></button>
          </div>
        </section>
      </div>
    </div>

    <div class="pickup-confirm">
      <div><span>Đã chọn:</span><strong>{{ selectedStore?.name || "Chưa chọn" }}</strong></div>
      <button type="button" :disabled="!selectedStore" @click="confirmPickup">Xác nhận <Check :size="18" /></button>
    </div>
  </section>
</template>

<style scoped>
.pickup-page {
  min-height: 100vh;
  padding: 70px 0 90px;
  background: var(--sf-bg);
}

.pickup-mobile-head {
  display: none;
}

.pickup-breadcrumb {
  color: #6b4e43;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-weight: 800;
}

.pickup-shell > h1 {
  margin: 28px 0 34px;
  font-size: clamp(38px, 5vw, 58px);
  line-height: 1;
  letter-spacing: -0.06em;
}

.pickup-layout {
  display: grid;
  grid-template-columns: 430px 1fr;
  gap: 40px;
  align-items: stretch;
}

.store-panel {
  display: grid;
  gap: 22px;
}

.store-filter {
  padding: 28px;
  border-radius: 14px;
  background: #edf4fd;
}

.search-field,
.mobile-filter-row label {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 62px;
  padding: 0 18px;
  border-radius: 8px;
  background: #dce8f7;
}

.search-field input,
.mobile-filter-row input {
  min-width: 0;
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 17px;
}

.filter-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: center;
  margin-top: 18px;
}

.filter-row select {
  height: 54px;
  border: none;
  border-radius: 8px;
  background: #dce8f7;
  padding: 0 16px;
  font-size: 16px;
}

.filter-row label {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-weight: 800;
}

.mobile-filter-row,
.mobile-chips {
  display: none;
}

.store-list {
  display: grid;
  gap: 20px;
}

.store-empty {
  padding: 28px;
  border-radius: 14px;
  background: #fff;
  color: var(--sf-muted);
}

.store-empty h2 {
  margin: 0 0 10px;
  color: var(--sf-ink);
}

.store-empty p {
  margin: 0;
  line-height: 1.6;
}

.store-card {
  padding: 28px;
  border-radius: 14px;
  background: #fff;
  border-left: 4px solid transparent;
}

.store-card.selected {
  border-left-color: var(--sf-primary);
}

.store-card.closed {
  opacity: 0.72;
}

.store-status {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.store-status span {
  padding: 5px 12px;
  background: #e8fff5;
  color: #13895f;
  font-weight: 900;
  text-transform: uppercase;
  font-size: 12px;
}

.store-status span.closed {
  background: #edf2f7;
  color: #6b7280;
}

.store-status small {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--sf-muted);
  font-weight: 800;
}

.store-card h2 {
  margin: 0 0 14px;
  font-size: 27px;
  line-height: 1.15;
  letter-spacing: -0.04em;
}

.store-card p {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
  color: #4b3d38;
  line-height: 1.6;
}

.store-actions {
  display: grid;
  grid-template-columns: 1fr 170px;
  gap: 16px;
  align-items: center;
  margin-top: 24px;
}

.store-actions a {
  color: var(--sf-primary);
  font-weight: 900;
}

.store-actions button {
  height: 54px;
  border: 1px solid #e2c9ba;
  border-radius: 8px;
  background: #fff7f2;
  color: var(--sf-primary);
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.store-actions button:disabled {
  background: #dce8f7;
  color: var(--sf-subtle);
  cursor: not-allowed;
}

.map-panel {
  min-height: 760px;
  border: 1px solid #314253;
  border-radius: 8px;
  background: #66757c;
  position: relative;
  overflow: hidden;
}

.map-panel::before {
  content: "";
  position: absolute;
  inset: 12% 8%;
  background: #c9ead1;
  clip-path: polygon(10% 50%, 23% 44%, 27% 28%, 48% 30%, 59% 21%, 83% 29%, 94% 48%, 82% 65%, 69% 75%, 58% 93%, 44% 78%, 29% 70%, 15% 65%);
  opacity: 0.88;
}

.map-shape {
  position: absolute;
  inset: 0;
}

.pin {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--sf-primary);
  color: #fff;
  box-shadow: 0 0 0 7px rgba(255, 255, 255, 0.8);
}

.pin-main {
  left: 50%;
  top: 54%;
  width: 42px;
  height: 42px;
}

.pin-secondary {
  left: 61%;
  top: 34%;
  width: 18px;
  height: 18px;
}

.map-shape strong {
  position: absolute;
  left: 38%;
  top: 49%;
  padding: 12px 22px;
  border-radius: 4px;
  background: var(--sf-primary);
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.map-controls {
  position: absolute;
  right: 28px;
  bottom: 28px;
  display: grid;
  gap: 10px;
}

.map-controls button {
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 5px;
  background: #fff;
}

.pickup-confirm {
  display: none;
}

@media (max-width: 1000px) {
  .pickup-layout {
    grid-template-columns: 1fr;
  }

  .map-panel {
    min-height: 420px;
  }
}

@media (max-width: 768px) {
  .pickup-page {
    padding: 0 0 180px;
  }

  .pickup-mobile-head {
    height: 78px;
    display: grid;
    grid-template-columns: 42px 1fr 42px;
    align-items: center;
    padding: 0 22px;
  }

  .pickup-mobile-head h1 {
    margin: 0;
    text-align: center;
    font-size: 23px;
  }

  .pickup-breadcrumb,
  .pickup-shell > h1,
  .store-filter,
  .map-panel {
    display: none;
  }

  .pickup-shell {
    width: 100%;
  }

  .pickup-layout {
    display: block;
  }

  .store-panel {
    display: block;
  }

  .mobile-filter-row {
    display: grid;
    grid-template-columns: 1fr 54px;
    gap: 12px;
    padding: 0 22px 18px;
  }

  .mobile-filter-row button {
    border: none;
    border-radius: 999px;
    background: #edf4fd;
  }

  .mobile-chips {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 0 22px 22px;
  }

  .mobile-chips button {
    flex: 0 0 auto;
    height: 42px;
    padding: 0 18px;
    border: none;
    border-radius: 999px;
    background: #dce8f7;
    color: var(--sf-ink);
    font-weight: 900;
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .mobile-chips .active {
    background: var(--sf-primary);
    color: #fff;
  }

  .store-list {
    padding: 34px 22px 0;
    background: #edf4fd;
  }

  .store-card {
    border-left: none;
    border: 1px solid #ead7cb;
    padding: 28px;
  }

  .store-card h2 {
    font-size: 25px;
  }

  .store-actions {
    grid-template-columns: 1fr 130px;
  }

  .pickup-confirm {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 74px;
    z-index: 45;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    align-items: center;
    padding: 18px 22px;
    background: #fff;
    box-shadow: 0 -12px 30px rgba(16, 24, 40, 0.08);
  }

  .pickup-confirm span,
  .pickup-confirm strong {
    display: block;
  }

  .pickup-confirm span {
    color: #5d4036;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 13px;
  }

  .pickup-confirm strong {
    margin-top: 4px;
  }

  .pickup-confirm button {
    height: 62px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--sf-primary), var(--sf-accent));
    color: #fff;
    font-weight: 900;
    font-size: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .pickup-confirm button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
