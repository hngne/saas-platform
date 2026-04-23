<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ArrowUpDown, SlidersHorizontal, X } from "lucide-vue-next";
import ProductCard from "@/components/ProductCard.vue";
import { storefrontApi, type ProductQuery } from "@/api/storefront";
import type { Category, Product } from "@/data/storefront";

const route = useRoute();

const selectedCategories = ref<string[]>([]);
const selectedSizes = ref<string[]>([]);
const selectedColors = ref<string[]>([]);
const selectedDiscounts = ref<string[]>([]);
const inStockOnly = ref(true);
const onSaleOnly = ref(false);
const hasVariantOnly = ref(false);
const minPriceInput = ref("");
const maxPriceInput = ref("");
const sort = ref("newest");
const apiProducts = ref<Product[]>([]);
const apiCategories = ref<Category[]>([]);
const apiError = ref("");
const loading = ref(false);

const sanitizePriceInput = (value: string) => value.replace(/[^\d]/g, "");
const normalizeFilterValue = (value: string) =>
  value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const parsePriceInput = (value: string) => {
  if (!value) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const sizeRankMap: Record<string, number> = {
  xxxs: 0,
  xxs: 1,
  xs: 2,
  s: 3,
  m: 4,
  l: 5,
  xl: 6,
  xxl: 7,
  xxxl: 8,
};

const discountRanges = [
  { key: "lt20", label: "< 20%", min: 1, max: 19.999 },
  { key: "20-30", label: "20% - 30%", min: 20, max: 29.999 },
  { key: "30-40", label: "30% - 40%", min: 30, max: 39.999 },
  { key: "40-50", label: "40% - 50%", min: 40, max: 49.999 },
  { key: "gte50", label: "50%+", min: 50, max: 100 },
];

const isHexColor = (value: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
const isColorValue = (value: string) => isHexColor(value) || value.startsWith("http");
const isSizeGroup = (label: string) => {
  const normalized = normalizeFilterValue(label);
  return normalized.includes("size") || normalized.includes("kich-thuoc");
};
const isColorGroup = (label: string) => {
  const normalized = normalizeFilterValue(label);
  return normalized.includes("mau") || normalized.includes("color");
};
const getSizeRank = (value: string) => {
  const normalized = normalizeFilterValue(value).replace(/-/g, "");
  if (normalized in sizeRankMap) return sizeRankMap[normalized]!;
  const numeric = Number(normalized.replace(",", "."));
  return Number.isFinite(numeric) ? 100 + numeric : 999;
};
const getDiscountPercent = (product: Product) =>
  product.oldPrice && product.oldPrice > product.price
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

const flattenCategories = (items: Category[]): Category[] =>
  items.flatMap((item) => [item, ...flattenCategories(item.children || [])]);

const getCategoryScope = (category?: Category | null): string[] => {
  if (!category) return [];
  const current = [category.slug, category.id].filter((value): value is string => Boolean(value));
  return [...current, ...(category.children || []).flatMap((child) => getCategoryScope(child))];
};

const mode = computed(() => route.meta.mode || "all");
const rootCategories = computed(() => apiCategories.value);
const categories = computed(() => flattenCategories(rootCategories.value));
const currentCategory = computed(
  () => categories.value.find((item) => item.slug === String(route.params.slug || "")) || null,
);
const isSearch = computed(() => mode.value === "search");
const searchQuery = computed(() => String(route.query.q || ""));
const currentCategoryScope = computed(() => new Set(getCategoryScope(currentCategory.value)));
const minPrice = computed(() => parsePriceInput(minPriceInput.value));
const maxPrice = computed(() => parsePriceInput(maxPriceInput.value));
const priceRangeError = computed(() => {
  if (minPrice.value !== null && minPrice.value < 0) return "Giá từ không được nhỏ hơn 0.";
  if (maxPrice.value !== null && maxPrice.value < 0) return "Giá đến không được nhỏ hơn 0.";
  if (minPrice.value !== null && maxPrice.value !== null && minPrice.value > maxPrice.value) {
    return "Khoảng giá không hợp lệ: giá từ phải nhỏ hơn hoặc bằng giá đến.";
  }
  return "";
});
const sizeOptions = computed(() => {
  const values = new Map<string, string>();
  for (const product of apiProducts.value) {
    for (const group of product.optionGroups || []) {
      if (!isSizeGroup(group.label)) continue;
      for (const option of group.values) values.set(option.normalizedValue, option.value);
    }
  }
  return [...values.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((left, right) => {
      const rankDiff = getSizeRank(left.label) - getSizeRank(right.label);
      return rankDiff || left.label.localeCompare(right.label, "vi", { numeric: true, sensitivity: "base" });
    });
});
const colorOptions = computed(() => {
  const values = new Map<string, { label: string; value: string }>();
  for (const product of apiProducts.value) {
    for (const swatch of product.swatches || []) {
      values.set(normalizeFilterValue(swatch.label), { label: swatch.label, value: swatch.value });
    }
    for (const group of product.optionGroups || []) {
      if (!isColorGroup(group.label)) continue;
      for (const option of group.values) {
        if (!values.has(option.normalizedValue)) {
          values.set(option.normalizedValue, { label: option.value, value: option.value });
        }
      }
    }
  }
  return [...values.entries()].map(([key, option]) => ({ key, ...option }));
});

const pageTitle = computed(() => {
  if (mode.value === "category") return currentCategory.value?.name || "Danh mục";
  if (mode.value === "search") return `Kết quả cho "${searchQuery.value}"`;
  return "Tất cả sản phẩm";
});

const subtitle = computed(() => {
  if (mode.value === "category") {
    return "Khám phá bộ sưu tập được tuyển chọn theo phong cách và nhu cầu sử dụng.";
  }
  if (mode.value === "search") {
    return `Hiển thị ${visibleProducts.value.length} kết quả phù hợp với từ khóa của bạn.`;
  }
  return "Tuyển chọn sản phẩm nổi bật từ các danh mục đang bán tại cửa hàng.";
});

const visibleProducts = computed(() => {
  let list = [...apiProducts.value];

  if (!apiProducts.value.length) return [];

  if (mode.value === "search") {
    const query = searchQuery.value.trim().toLowerCase();
    list = query ? list.filter((item) => item.name.toLowerCase().includes(query)) : list;
  }

  if (mode.value === "category" && currentCategoryScope.value.size > 0 && !loading.value) {
    list = list.filter((item) => currentCategoryScope.value.has(item.category));
  }

  if (selectedCategories.value.length > 0) {
    const selectedScope = new Set(
      selectedCategories.value.flatMap((slug) =>
        getCategoryScope(categories.value.find((item) => item.slug === slug)),
      ),
    );
    list = list.filter((item) => selectedScope.has(item.category));
  }

  if (inStockOnly.value) list = list.filter((item) => item.inStock);
  if (onSaleOnly.value) list = list.filter((item) => Boolean(item.oldPrice));
  if (hasVariantOnly.value) list = list.filter((item) => (item.optionGroups?.length || 0) > 0);
  if (selectedSizes.value.length > 0) {
    const selected = new Set(selectedSizes.value);
    list = list.filter((item) =>
      (item.optionGroups || []).some(
        (group) =>
          isSizeGroup(group.label) &&
          group.values.some((value) => selected.has(value.normalizedValue)),
      ),
    );
  }
  if (selectedColors.value.length > 0) {
    const selected = new Set(selectedColors.value);
    list = list.filter((item) => {
      const hasSwatch = (item.swatches || []).some((swatch) =>
        selected.has(normalizeFilterValue(swatch.label)),
      );
      const hasColorValue = (item.optionGroups || []).some(
        (group) =>
          isColorGroup(group.label) &&
          group.values.some((value) => selected.has(value.normalizedValue)),
      );
      return hasSwatch || hasColorValue;
    });
  }
  if (selectedDiscounts.value.length > 0) {
    const selectedRanges = discountRanges.filter((range) => selectedDiscounts.value.includes(range.key));
    list = list.filter((item) => {
      const discount = getDiscountPercent(item);
      return selectedRanges.some((range) => discount >= range.min && discount <= range.max);
    });
  }

  return list;
});

const removeSelectedCategory = (slug: string) => {
  selectedCategories.value = selectedCategories.value.filter((item) => item !== slug);
};

const toggleValue = (target: { value: string[] }, value: string) => {
  target.value = target.value.includes(value)
    ? target.value.filter((item) => item !== value)
    : [...target.value, value];
};
const toggleSize = (value: string) => toggleValue(selectedSizes, value);
const toggleColor = (value: string) => toggleValue(selectedColors, value);
const toggleDiscount = (value: string) => toggleValue(selectedDiscounts, value);

const loadCategories = async () => {
  apiCategories.value = await storefrontApi.getCategories().catch(() => []);
};

const buildQuery = (): ProductQuery => {
  const routeCategory = String(route.params.slug || "");
  const matchedCategory = categories.value.find((category) => category.slug === routeCategory);
  const query: ProductQuery = {
    limit: 50,
  };

  if (mode.value === "search") query.search = searchQuery.value;
  if (mode.value === "category" && routeCategory) {
    query.category_id = matchedCategory?.id || matchedCategory?.slug || routeCategory;
  }
  if (minPrice.value !== null) query.min_price = minPrice.value;
  if (maxPrice.value !== null) query.max_price = maxPrice.value;

  if (sort.value === "price-asc") {
    query.sort_by = "base_price";
    query.sort_order = "asc";
  } else if (sort.value === "price-desc") {
    query.sort_by = "base_price";
    query.sort_order = "desc";
  } else {
    query.sort_by = "created_at";
    query.sort_order = "desc";
  }

  return query;
};

const loadProducts = async () => {
  if (priceRangeError.value) {
    apiError.value = priceRangeError.value;
    return;
  }

  loading.value = true;
  apiError.value = "";

  try {
    apiProducts.value = await storefrontApi.getProducts(buildQuery());
  } catch {
    apiProducts.value = [];
    apiError.value = "Không tải được dữ liệu sản phẩm của cửa hàng hiện tại.";
  } finally {
    loading.value = false;
  }
};

watch(
  currentCategory,
  (category) => {
    selectedCategories.value = category ? [category.slug] : [];
  },
  { immediate: true },
);

watch(
  [() => route.fullPath, sort, minPriceInput, maxPriceInput],
  async () => {
    await loadCategories();
    await loadProducts();
  },
  { immediate: true },
);

const handlePriceInput = (field: "min" | "max", event: Event) => {
  const nextValue = sanitizePriceInput((event.target as HTMLInputElement).value);
  if (field === "min") minPriceInput.value = nextValue;
  else maxPriceInput.value = nextValue;
};
</script>

<template>
  <section class="catalog-mobile-hero">
    <div class="sf-container">
      <p>Trang chủ › {{ pageTitle }}</p>
      <h1>{{ currentCategory?.name ? `${currentCategory.name} hiện đại` : pageTitle }}</h1>
      <span>{{ subtitle }}</span>

      <div class="mobile-chips">
        <RouterLink to="/products">Tất cả</RouterLink>
        <RouterLink v-for="category in rootCategories" :key="category.slug" :to="`/categories/${category.slug}`">
          {{ category.name }}
        </RouterLink>
      </div>
    </div>
  </section>

  <section class="catalog-page sf-container">
    <aside class="filters">
      <div class="filter-head">
        <strong>Bộ lọc</strong>
        <span>{{ visibleProducts.length }} sản phẩm</span>
      </div>

      <h2>Danh mục</h2>

      <div v-for="category in rootCategories" :key="category.slug" class="category-group">
        <label class="filter-line">
          <input v-model="selectedCategories" type="checkbox" :value="category.slug" />
          <span>{{ category.name }}</span>
        </label>

        <label v-for="child in category.children || []" :key="child.slug" class="filter-line category-child">
          <input v-model="selectedCategories" type="checkbox" :value="child.slug" />
          <span>{{ child.name }}</span>
        </label>
      </div>

      <div v-if="sizeOptions.length" class="filter-group">
        <h3>Kích cỡ</h3>
        <div class="size-options">
          <button
            v-for="size in sizeOptions"
            :key="size.key"
            type="button"
            :class="{ active: selectedSizes.includes(size.key) }"
            @click="toggleSize(size.key)"
          >
            {{ size.label }}
          </button>
        </div>
      </div>

      <div v-if="colorOptions.length" class="filter-group">
        <h3>Màu sắc</h3>
        <div class="color-options">
          <button
            v-for="color in colorOptions"
            :key="color.key"
            type="button"
            :class="{ active: selectedColors.includes(color.key) }"
            :title="color.label"
            @click="toggleColor(color.key)"
          >
            <span
              class="color-dot"
              :style="isHexColor(color.value) ? { backgroundColor: color.value } : undefined"
            >
              <img v-if="color.value.startsWith('http')" :src="color.value" :alt="color.label" />
              <small v-else-if="!isColorValue(color.value)">{{ color.label.slice(0, 1) }}</small>
            </span>
          </button>
        </div>
      </div>

      <div class="filter-group">
        <h3>Khoảng giá</h3>
        <div class="price-fields">
          <input
            :value="minPriceInput"
            type="text"
            inputmode="numeric"
            placeholder="149.000 ₫"
            @input="handlePriceInput('min', $event)"
          />
          <input
            :value="maxPriceInput"
            type="text"
            inputmode="numeric"
            placeholder="399.200 ₫"
            @input="handlePriceInput('max', $event)"
          />
        </div>
        <p v-if="priceRangeError" class="price-error">{{ priceRangeError }}</p>
      </div>

      <div class="filter-group">
        <h3>Phần trăm giảm</h3>
        <label v-for="range in discountRanges" :key="range.key" class="filter-line">
          <input v-model="selectedDiscounts" type="checkbox" :value="range.key" />
          <span>{{ range.label }}</span>
        </label>
      </div>

      <div class="filter-group">
        <h3>Trạng thái</h3>
        <label class="filter-line"><input v-model="inStockOnly" type="checkbox" /> <span>Còn hàng</span></label>
        <label class="filter-line"><input v-model="hasVariantOnly" type="checkbox" /> <span>Có biến thể</span></label>
        <label class="filter-line"><input v-model="onSaleOnly" type="checkbox" /> <span>Đang giảm giá</span></label>
      </div>
    </aside>

    <div class="catalog-content">
      <div class="breadcrumbs">Trang chủ / {{ isSearch ? "Tìm kiếm" : "Sản phẩm" }}</div>

      <div class="catalog-heading">
        <div>
          <h1>{{ pageTitle }}</h1>
          <p>{{ visibleProducts.length }} sản phẩm</p>
        </div>

        <select v-model="sort" aria-label="Sắp xếp">
          <option value="newest">Sắp xếp: Mới nhất</option>
          <option value="price-asc">Giá tăng dần</option>
          <option value="price-desc">Giá giảm dần</option>
        </select>
      </div>

      <div v-if="isSearch && searchQuery" class="search-suggestion">
        Kết quả tìm kiếm theo từ khóa <strong>"{{ searchQuery }}"</strong>
      </div>

      <div class="active-filters" :class="{ search: isSearch }">
        <template v-if="!isSearch">
          <span v-for="slug in selectedCategories" :key="slug">
            {{ categories.find((item) => item.slug === slug)?.name || slug }}
            <button type="button" @click="removeSelectedCategory(slug)">
              <X :size="13" />
            </button>
          </span>
          <span v-if="inStockOnly">
            Còn hàng
            <button type="button" @click="inStockOnly = false"><X :size="13" /></button>
          </span>
          <span v-if="onSaleOnly">
            Đang giảm giá
            <button type="button" @click="onSaleOnly = false"><X :size="13" /></button>
          </span>
          <span v-if="hasVariantOnly">
            Có biến thể
            <button type="button" @click="hasVariantOnly = false"><X :size="13" /></button>
          </span>
          <span v-for="size in selectedSizes" :key="`size-${size}`">
            Size {{ sizeOptions.find((item) => item.key === size)?.label || size }}
            <button type="button" @click="toggleSize(size)"><X :size="13" /></button>
          </span>
          <span v-for="color in selectedColors" :key="`color-${color}`">
            {{ colorOptions.find((item) => item.key === color)?.label || color }}
            <button type="button" @click="toggleColor(color)"><X :size="13" /></button>
          </span>
          <span v-for="discount in selectedDiscounts" :key="`discount-${discount}`">
            Giảm {{ discountRanges.find((item) => item.key === discount)?.label || discount }}
            <button type="button" @click="toggleDiscount(discount)"><X :size="13" /></button>
          </span>
          <span v-if="minPrice !== null || maxPrice !== null">
            {{ minPrice !== null ? `${minPrice.toLocaleString("vi-VN")}đ` : "0đ" }} -
            {{ maxPrice !== null ? `${maxPrice.toLocaleString("vi-VN")}đ` : "∞" }}
          </span>
        </template>

        <template v-else>
          <strong>Từ khóa:</strong>
          <RouterLink to="/search?q=sofa">sofa</RouterLink>
          <RouterLink to="/search?q=ban">bàn</RouterLink>
          <RouterLink to="/search?q=den">đèn</RouterLink>
        </template>
      </div>

      <div class="mobile-toolbar">
        <strong>{{ visibleProducts.length }} sản phẩm</strong>
        <div>
          <button type="button"><SlidersHorizontal :size="18" /> Bộ lọc</button>
          <button type="button"><ArrowUpDown :size="18" /> Sắp xếp</button>
        </div>
      </div>

      <div v-if="visibleProducts.length" class="product-grid">
        <ProductCard v-for="product in visibleProducts" :key="product.id" :product="product" compact />
      </div>

      <div v-else class="catalog-empty">
        <h2>Không có sản phẩm để hiển thị</h2>
        <p>{{ apiError || "Danh mục này hiện chưa có sản phẩm active phù hợp với bộ lọc hiện tại." }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.catalog-mobile-hero {
  display: none;
}

.catalog-page {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 44px;
  padding-top: 56px;
}

.filters {
  position: sticky;
  top: 96px;
  align-self: start;
  max-height: calc(100vh - 116px);
  overflow: auto;
  padding: 0 8px 20px 0;
  background: transparent;
  scrollbar-width: thin;
}

.filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--sf-line);
}

.filter-head strong {
  font-size: 18px;
  letter-spacing: -0.02em;
}

.filter-head span {
  color: var(--sf-muted);
  font-size: 13px;
  font-weight: 800;
}

.filters h2,
.filter-group h3 {
  margin: 0 0 14px;
  color: #2f3946;
  font-size: 16px;
  letter-spacing: -0.01em;
}

.category-group + .category-group {
  margin-top: 4px;
}

.category-child {
  margin-left: 12px;
}

.filter-group {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--sf-line);
}

.filter-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
  margin: 6px 0;
  color: #394554;
  font-size: 15px;
  font-weight: 800;
}

.filter-line input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 5px;
  accent-color: var(--sf-primary);
}

.size-options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
}

.size-options button {
  height: 40px;
  border: 1px solid var(--sf-line);
  border-radius: 10px;
  background: #fff;
  color: #263241;
  font-weight: 900;
}

.size-options button.active {
  border-color: var(--sf-primary);
  background: var(--sf-primary);
  color: #fff;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.color-options button {
  width: 36px;
  height: 36px;
  padding: 3px;
  border: 1px solid #d9e2ee;
  border-radius: 999px;
  background: #fff;
}

.color-options button.active {
  border-color: var(--sf-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--sf-primary) 18%, transparent);
}

.color-dot {
  display: inline-flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: inherit;
  background: #eef2f7;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}

.color-dot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.price-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.price-fields input {
  width: 100%;
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--sf-line);
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  font-weight: 800;
}

.price-error {
  margin: 10px 0 0;
  color: var(--sf-danger);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.catalog-content {
  min-width: 0;
}

.breadcrumbs {
  color: #596476;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.catalog-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin: 18px 0 12px;
}

.catalog-heading h1 {
  margin: 0;
  font-size: clamp(44px, 6vw, 72px);
  line-height: 0.95;
}

.catalog-heading p {
  margin: 20px 0 0;
  color: var(--sf-muted);
  font-size: 18px;
}

.catalog-heading select {
  min-width: 210px;
  height: 48px;
  padding: 0 16px;
  border: 1px solid var(--sf-line);
  border-radius: 8px;
  background: #fff;
  color: var(--sf-ink);
  font-weight: 700;
}

.search-suggestion {
  display: inline-flex;
  align-items: center;
  padding: 16px 22px;
  margin: 8px 0 28px;
  border: 1px solid var(--sf-line);
  border-radius: 10px;
  background: #fff;
  color: #5d4036;
  font-size: 17px;
}

.search-suggestion strong {
  color: var(--sf-primary);
}

.active-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 46px;
  flex-wrap: wrap;
}

.active-filters span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #e4edf9;
  color: #4d5a6e;
  font-weight: 700;
}

.active-filters button {
  border: none;
  background: transparent;
  display: inline-flex;
  color: currentColor;
}

.active-filters.search {
  gap: 12px;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 13px;
  font-weight: 900;
}

.active-filters.search a {
  padding: 10px 18px;
  border-radius: 999px;
  background: #dbe7f6;
  color: var(--sf-ink);
  letter-spacing: 0;
  text-transform: none;
}

.mobile-toolbar {
  display: none;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 36px;
}

.catalog-empty {
  padding: 42px;
  border-radius: var(--sf-radius-md);
  background: #fff;
  box-shadow: var(--sf-shadow-soft);
}

.catalog-empty h2 {
  margin: 0 0 10px;
}

.catalog-empty p {
  margin: 0;
  color: var(--sf-muted);
  font-weight: 700;
}

@media (max-width: 1100px) {
  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .catalog-mobile-hero {
    display: block;
    padding: 22px 0 18px;
    border-bottom: 1px solid var(--sf-line);
    background: var(--sf-bg);
    text-align: center;
  }

  .catalog-mobile-hero p {
    margin: 0;
    color: #5f392b;
  }

  .catalog-mobile-hero h1 {
    margin: 32px auto 14px;
    max-width: 360px;
    font-size: 34px;
    line-height: 1.08;
  }

  .catalog-mobile-hero span {
    display: block;
    max-width: 370px;
    margin: 0 auto;
    color: #5b4a44;
    line-height: 1.7;
  }

  .mobile-chips {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 28px 16px 4px;
    margin: 0 -16px;
  }

  .mobile-chips a {
    flex: 0 0 auto;
    padding: 12px 20px;
    border-radius: 999px;
    background: #e7eef8;
    color: var(--sf-ink);
    font-weight: 800;
  }

  .mobile-chips a.router-link-active {
    background: var(--sf-accent);
    color: #fff;
  }

  .catalog-page {
    display: block;
    padding-top: 18px;
  }

  .filters,
  .breadcrumbs,
  .catalog-heading,
  .active-filters {
    display: none;
  }

  .mobile-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 22px;
  }

  .mobile-toolbar strong {
    font-size: 17px;
  }

  .mobile-toolbar div {
    display: flex;
    gap: 12px;
  }

  .mobile-toolbar button {
    border: none;
    background: transparent;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 800;
    color: var(--sf-ink);
  }

  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
}
</style>
