<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch, nextTick, onBeforeUnmount } from "vue";
import { LocateFixed, MapPin, Phone, Search, Store, Navigation } from "lucide-vue-next";
import { storefrontApi } from "@/api/storefront";
import { getStoreDisplayName } from "@/utils/storefront-brand";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";

type StoreLocationVm = Awaited<ReturnType<typeof storefrontApi.getStores>>[number];

const apiStores = ref<StoreLocationVm[]>([]);
const apiError = ref("");
const loading = ref(false);
const isLocating = ref(false);
const search = ref("");
const displayStoreName = computed(getStoreDisplayName);

const mapContainer = ref<HTMLElement | null>(null);
const leafletMap = shallowRef<L.Map | null>(null);
const markers = shallowRef<L.Marker[]>([]);
const userMarker = shallowRef<L.Marker | null>(null);

const storeLocations = computed(() => {
  // Nếu đang hiển thị theo GPS/Nearest, không cần filter text nữa (để nguyên danh sách).
  // Nếu muốn vẫn giữ filter text thì giữ code dưới. Ta giữ filter text cho tiện.
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return apiStores.value;
  // Note: if user just searched by Nominatim, keyword is the address. 
  // It might filter out all stores if they don't match the address text!
  // To fix: only filter by keyword if it's a local search, but since we use the same input for Nominatim, 
  // we'll just return all apiStores if they just geocoded, or we can separate the inputs.
  // Actually, let's keep it simple: return apiStores directly to show nearest stores!
  return apiStores.value;
});

const initMap = () => {
  if (!mapContainer.value || leafletMap.value) return;
  leafletMap.value = L.map(mapContainer.value).setView([16.047079, 108.20623], 6);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://carto.com/">Carto</a>',
  }).addTo(leafletMap.value);
};

const renderMarkers = () => {
  if (!leafletMap.value) return;
  
  markers.value.forEach(m => m.remove());
  markers.value = [];

  const bounds = L.latLngBounds([]);
  let hasValidStore = false;

  apiStores.value.forEach((store) => {
    if (store.latitude && store.longitude) {
      hasValidStore = true;
      const latLng = L.latLng(store.latitude, store.longitude);
      bounds.extend(latLng);

      const isActive = store.status === 'OPEN';
      const color = isActive ? 'var(--sf-primary)' : '#667085';
      const bg = isActive ? '#fff' : '#f1f5f9';

      const iconHtml = `
        <div style="
          background: ${bg}; 
          border: 2px solid ${color}; 
          color: ${color};
          border-radius: 8px; 
          padding: 4px 8px; 
          font-weight: 800; 
          font-size: 12px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transform: translate(-50%, -100%);
        ">
          ${store.shortName || store.name}
        </div>
      `;

      const marker = L.marker(latLng, {
        icon: L.divIcon({ html: iconHtml, className: 'custom-pin' })
      }).addTo(leafletMap.value!);

      marker.bindPopup(`<b>${store.name}</b><br>${store.address}`);
      markers.value.push(marker);
    }
  });

  if (hasValidStore && !userMarker.value) {
    leafletMap.value.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }
};

/** Gọi invalidateSize nhiều lần để chống xám tuyệt đối */
const forceMapResize = () => {
  if (!leafletMap.value) return;
  leafletMap.value.invalidateSize();
  setTimeout(() => leafletMap.value?.invalidateSize(), 100);
  setTimeout(() => leafletMap.value?.invalidateSize(), 300);
  setTimeout(() => leafletMap.value?.invalidateSize(), 600);
};

const initializeAndRenderMap = () => {
  initMap();
  renderMarkers();
  forceMapResize();
};

let routePolyline: L.Polyline | null = null;

const loadDefaultStores = async () => {
  loading.value = true;
  apiError.value = "";
  try {
    apiStores.value = await storefrontApi.getStores();
  } catch {
    apiStores.value = [];
    apiError.value = "Không tải được điểm nhận hàng của shop hiện tại.";
  } finally {
    loading.value = false;
    // Quan trọng: nextTick SAU khi loading=false để DOM đã render map container
    nextTick(() => {
      initializeAndRenderMap();
    });
  }
};

const handleNearestResult = async (lat: number, lng: number) => {
  try {
    apiStores.value = await storefrontApi.getNearestStores(lat, lng);
    // Đợi Vue render xong DOM mới init map
    await nextTick();
    initializeAndRenderMap();
    if (leafletMap.value) {
      if (userMarker.value) userMarker.value.remove();
      
      userMarker.value = L.marker([lat, lng], {
        icon: L.divIcon({ 
          html: `<div style="font-size: 28px; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3)); transform: translate(-50%, -100%);">📍</div>`, 
          className: '' 
        }),
        zIndexOffset: 1000
      }).addTo(leafletMap.value);
      
      userMarker.value.bindPopup("<b>Vị trí của bạn</b>").openPopup();
      leafletMap.value.flyTo([lat, lng], 13);
    }
  } catch (err) {
    apiError.value = "Lỗi khi lấy danh sách cửa hàng gần nhất.";
  }
};

const findNearMe = () => {
  if (!navigator.geolocation) {
    apiError.value = "Trình duyệt của bạn không hỗ trợ định vị GPS.";
    return;
  }
  isLocating.value = true;
  apiError.value = "";
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      handleNearestResult(position.coords.latitude, position.coords.longitude).finally(() => {
        isLocating.value = false;
      });
    },
    (err) => {
      isLocating.value = false;
      apiError.value = "Không thể lấy được vị trí. Vui lòng cấp quyền GPS hoặc tìm bằng địa chỉ.";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

const searchLocation = async () => {
  const query = search.value.trim();
  if (!query) {
    loadDefaultStores();
    if (userMarker.value) {
      userMarker.value.remove();
      userMarker.value = null;
    }
    return;
  }
  
  isLocating.value = true;
  apiError.value = "";
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=vn&limit=1`);
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      await handleNearestResult(lat, lng);
    } else {
      apiError.value = "Không tìm thấy địa chỉ này trên bản đồ. Vui lòng thử lại.";
    }
  } catch (err) {
    apiError.value = "Lỗi khi tìm kiếm địa chỉ.";
  } finally {
    isLocating.value = false;
  }
};

let mapResizeObserver: ResizeObserver | null = null;

/** Vẽ tuyến đường từ vị trí người dùng đến cửa hàng bằng OSRM */
const drawRoute = async (storeLat: number, storeLng: number) => {
  if (!leafletMap.value) return;
  // Xóa route cũ nếu có
  if (routePolyline) {
    routePolyline.remove();
    routePolyline = null;
  }

  // Lấy vị trí người dùng
  if (!navigator.geolocation) {
    alert("Trình duyệt không hỗ trợ GPS để vẽ chỉ đường.");
    return;
  }

  isLocating.value = true;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
    );
    const userLat = pos.coords.latitude;
    const userLng = pos.coords.longitude;

    // Gọi OSRM API (miễn phí, OpenStreetMap)
    const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${storeLng},${storeLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.routes && json.routes.length > 0) {
      const coords = json.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
      routePolyline = L.polyline(coords, {
        color: '#ea580c',
        weight: 5,
        opacity: 0.85,
        dashArray: '10, 6',
      }).addTo(leafletMap.value!);

      // Hiển thị marker vị trí người dùng nếu chưa có
      if (userMarker.value) userMarker.value.remove();
      userMarker.value = L.marker([userLat, userLng], {
        icon: L.divIcon({
          html: `<div style="font-size: 28px; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3)); transform: translate(-50%, -100%);">📍</div>`,
          className: ''
        }),
        zIndexOffset: 1000
      }).addTo(leafletMap.value!);

      // Zoom bản đồ để hiển thị toàn bộ tuyến đường
      leafletMap.value!.fitBounds(routePolyline.getBounds(), { padding: [60, 60] });

      // Tính khoảng cách & thời gian
      const distKm = (json.routes[0].distance / 1000).toFixed(1);
      const durMin = Math.round(json.routes[0].duration / 60);
      userMarker.value.bindPopup(`<b>Vị trí của bạn</b><br>Khoảng cách: ${distKm} km<br>Thời gian ước tính: ~${durMin} phút`).openPopup();
    } else {
      alert("Không tìm được tuyến đường. Vui lòng thử lại.");
    }
  } catch {
    alert("Lỗi khi tìm đường. Vui lòng kiểm tra kết nối mạng.");
  } finally {
    isLocating.value = false;
  }
};

const flyToStore = (store: StoreLocationVm) => {
  if (!store.latitude || !store.longitude) {
    alert("Cửa hàng này chưa được cập nhật tọa độ trên bản đồ!");
    return;
  }
  drawRoute(Number(store.latitude), Number(store.longitude));
};

onMounted(() => {
  loadDefaultStores();
});

watch(mapContainer, (newVal) => {
  if (newVal) {
    if (mapResizeObserver) mapResizeObserver.disconnect();
    mapResizeObserver = new ResizeObserver(() => {
      if (leafletMap.value) leafletMap.value.invalidateSize();
    });
    mapResizeObserver.observe(newVal);
    // Container vừa xuất hiện, nếu map đã init thì resize ngay
    if (leafletMap.value) forceMapResize();
  }
});

onBeforeUnmount(() => {
  if (routePolyline) routePolyline.remove();
  if (mapResizeObserver) mapResizeObserver.disconnect();
  if (leafletMap.value) leafletMap.value.remove();
});
</script>

<template>
  <section class="locator-page theme-editorial sf-container">
    <header class="locator-heading">
      <div>
        <small>{{ displayStoreName }}</small>
        <h1>Hệ thống cửa hàng</h1>
        <p>Danh sách điểm nhận hàng active của shop hiện tại. Không hiển thị dữ liệu mẫu nếu shop chưa cấu hình.</p>
      </div>
      <div class="search-actions">
        <label class="search-box">
          <Search :size="20" />
          <input 
            v-model="search" 
            placeholder="Tìm địa chỉ, tên đường, khu vực..." 
            @keydown.enter="searchLocation"
          />
          <button type="button" class="btn-search" @click="searchLocation" :disabled="isLocating">
            {{ isLocating ? 'Đang tìm...' : 'Tìm' }}
          </button>
        </label>
        <button type="button" class="btn-gps" @click="findNearMe" :disabled="isLocating">
          <Navigation :size="18" /> Gần tôi
        </button>
      </div>
    </header>

    <p v-if="loading" class="store-state">Đang tải cửa hàng...</p>
    <p v-else-if="apiError" class="store-state warning">{{ apiError }}</p>

    <div v-else-if="storeLocations.length" class="locator-layout">
      <aside class="store-list">
        <p>Tìm thấy <strong>{{ storeLocations.length }}</strong> cửa hàng</p>

        <article
          v-for="boutique in storeLocations"
          :key="boutique.id"
          :class="{ active: boutique.selected, closed: boutique.status === 'CLOSED' }"
        >
          <div class="store-title">
            <h2>{{ boutique.name }}</h2>
            <span>{{ boutique.status === "OPEN" ? "Đang mở cửa" : "Đã đóng cửa" }}</span>
          </div>
          <small v-if="boutique.distance">Cách bạn {{ boutique.distance }}</small>
          <p><MapPin :size="19" /> {{ boutique.address }}</p>
          <p><Phone :size="18" /> {{ boutique.phone }}</p>
          <p><Store :size="18" /> {{ boutique.hours }}</p>
          <div class="store-actions">
            <button type="button" @click="flyToStore(boutique)"><LocateFixed :size="18" /> Chỉ đường</button>
            <button type="button" class="call"><Phone :size="18" /> Gọi điện</button>
          </div>
        </article>
      </aside>

      <main class="map-panel" aria-label="Bản đồ cửa hàng">
        <div ref="mapContainer" class="leaflet-map-container"></div>
      </main>
    </div>

    <section v-else class="store-empty">
      <Store :size="44" />
      <h2>Chưa có cửa hàng nào</h2>
      <p>Shop này chưa cấu hình điểm nhận hàng active trong CMS nên storefront không hiển thị dữ liệu giả.</p>
    </section>
  </section>
</template>

<style scoped>
.locator-page {
  padding-top: 42px;
}

.locator-heading {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}

.locator-heading small {
  display: inline-block;
  margin-bottom: 8px;
  color: var(--sf-primary);
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.locator-heading h1 {
  margin: 0;
  font-size: clamp(42px, 6vw, 68px);
  line-height: 0.95;
  letter-spacing: -0.07em;
}

.locator-heading p {
  max-width: 720px;
  margin: 14px 0 0;
  color: var(--sf-muted);
  line-height: 1.7;
}

.search-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(430px, 100%);
}

.search-box {
  height: 54px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px 0 18px;
  border-radius: 12px;
  background: #dce8f7;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.search-box:focus-within {
  border-color: var(--sf-primary);
  background: #fff;
  box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.1);
}

.search-box input {
  min-width: 0;
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-size: 16px;
}

.btn-search {
  height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: var(--sf-primary);
  color: #fff;
  font-weight: 800;
  white-space: nowrap;
}

.btn-search:disabled, .btn-gps:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-gps {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #dce8f7;
  border-radius: 12px;
  background: #fff;
  color: #1276ad;
  font-weight: 800;
  font-size: 15px;
  box-shadow: var(--sf-shadow-soft);
}

.btn-gps:hover:not(:disabled) {
  background: #f0f6fc;
}

.locator-layout {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 28px;
  align-items: stretch;
}

.store-list {
  display: grid;
  align-content: start;
  gap: 18px;
}

.store-list > p,
.store-state {
  margin: 0;
  color: var(--sf-muted);
  font-weight: 800;
}

.store-state {
  padding: 30px;
  border-radius: 12px;
  background: #fff;
}

.store-state.warning {
  color: var(--sf-primary);
}

.store-list article {
  padding: 24px;
  border-radius: 12px;
  background: #fff;
  box-shadow: var(--sf-shadow-soft);
}

.store-list article.active {
  border: 1px solid #ead7cb;
  box-shadow: inset 4px 0 0 var(--sf-primary), var(--sf-shadow-soft);
}

.store-list article.closed {
  opacity: 0.7;
}

.store-title {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.store-title h2 {
  margin: 0;
  font-size: 22px;
}

.store-title span {
  height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 4px;
  background: #d8efff;
  color: #1276ad;
  font-weight: 900;
  white-space: nowrap;
}

.closed .store-title span {
  background: #dce8f7;
  color: #667085;
}

.store-list small {
  display: block;
  margin: 10px 0 16px;
  color: #5c4037;
}

.store-list p {
  display: flex;
  gap: 10px;
  color: #5c4037;
  line-height: 1.6;
}

.store-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 18px;
}

.store-actions button {
  height: 46px;
  border: none;
  border-radius: 8px;
  background: var(--sf-primary);
  color: #fff;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.store-actions .call {
  border: 1px solid #ead7cb;
  background: #fff;
  color: var(--sf-ink);
}

.map-panel {
  min-height: 620px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(180deg, #dfe8f5 0%, #cfd9e8 100%);
  box-shadow: var(--sf-shadow-soft);
  position: sticky;
  top: 94px;
}

.leaflet-map-container {
  width: 100%;
  height: 100%;
  min-height: 620px; /* Bắt buộc phải có height rõ ràng cho Leaflet */
  position: relative;
  z-index: 1; /* Leaflet needs to be under modal/headers */
}

.store-empty {
  min-height: 360px;
  display: grid;
  place-items: center;
  gap: 12px;
  padding: 44px;
  border-radius: 16px;
  background: #fff;
  color: var(--sf-muted);
  text-align: center;
  box-shadow: var(--sf-shadow-soft);
}

.store-empty h2 {
  margin: 0;
  color: var(--sf-ink);
}

.store-empty p {
  max-width: 560px;
  margin: 0;
  line-height: 1.7;
}

@media (max-width: 980px) {
  .locator-heading {
    display: block;
  }

  .search-box {
    width: 100%;
    margin-top: 18px;
  }

  .locator-layout {
    grid-template-columns: 1fr;
  }

  .map-panel {
    min-height: 360px;
    position: relative;
    top: auto;
    order: -1;
  }
}

@media (max-width: 640px) {
  .store-actions {
    grid-template-columns: 1fr;
  }
}
</style>
