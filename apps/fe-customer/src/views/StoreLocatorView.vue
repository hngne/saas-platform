<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { LocateFixed, MapPin, Phone, Search, Store } from "lucide-vue-next";
import { storefrontApi } from "@/api/storefront";
import { getStoreDisplayName } from "@/utils/storefront-brand";

type StoreLocationVm = Awaited<ReturnType<typeof storefrontApi.getStores>>[number];

const apiStores = ref<StoreLocationVm[]>([]);
const apiError = ref("");
const loading = ref(false);
const search = ref("");
const displayStoreName = computed(getStoreDisplayName);

const storeLocations = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  return apiStores.value.filter(
    (store) =>
      !keyword ||
      store.name.toLowerCase().includes(keyword) ||
      store.address.toLowerCase().includes(keyword) ||
      store.phone.toLowerCase().includes(keyword),
  );
});

onMounted(async () => {
  loading.value = true;
  apiError.value = "";
  try {
    apiStores.value = await storefrontApi.getStores();
  } catch {
    apiStores.value = [];
    apiError.value = "Không tải được điểm nhận hàng của shop hiện tại.";
  } finally {
    loading.value = false;
  }
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
      <label class="search-box">
        <Search :size="20" />
        <input v-model="search" placeholder="Tìm địa chỉ, tên đường, số điện thoại..." />
      </label>
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
            <button type="button"><LocateFixed :size="18" /> Chỉ đường</button>
            <button type="button" class="call"><Phone :size="18" /> Gọi điện</button>
          </div>
        </article>
      </aside>

      <main class="map-panel" aria-label="Bản đồ cửa hàng">
        <div class="map-placeholder">
          <span class="pin pin-main"><MapPin :size="26" /><b>{{ storeLocations[0]?.shortName || storeLocations[0]?.name }}</b></span>
          <span v-for="boutique in storeLocations.slice(1, 4)" :key="boutique.id" class="pin pin-secondary"><MapPin :size="20" /></span>
        </div>
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

.search-box {
  width: min(430px, 100%);
  height: 54px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  border-radius: 12px;
  background: #dce8f7;
}

.search-box input {
  min-width: 0;
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-size: 16px;
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

.map-placeholder {
  position: relative;
  height: 100%;
  min-height: inherit;
}

.pin {
  position: absolute;
  color: var(--sf-primary);
}

.pin-main {
  left: 52%;
  top: 52%;
  display: grid;
  justify-items: center;
}

.pin-main b {
  margin-top: 4px;
  padding: 8px 14px;
  border-radius: 4px;
  background: #fff;
  color: var(--sf-primary);
}

.pin-secondary {
  left: 28%;
  top: 36%;
  color: #5c4037;
}

.pin-secondary + .pin-secondary {
  left: auto;
  right: 22%;
  top: 64%;
}

.pin-secondary + .pin-secondary + .pin-secondary {
  right: 42%;
  top: 24%;
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
