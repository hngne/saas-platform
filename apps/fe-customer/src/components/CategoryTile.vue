<script setup lang="ts">
import type { Category } from "@/data/storefront";

defineProps<{ category: Category }>();
</script>

<template>
  <RouterLink :to="`/categories/${category.slug}`" class="category-tile" :class="category.size">
    <img :src="category.image" :alt="category.name" />
    <span class="category-shade"></span>
    <span class="category-copy">
      <strong>{{ category.name }}</strong>
      <small>{{ category.caption }}</small>
    </span>
  </RouterLink>
</template>

<style scoped>
.category-tile {
  position: relative;
  min-height: 190px;
  border-radius: var(--sf-radius-sm);
  overflow: hidden;
  background: var(--sf-dark);
  color: #fff;
}

.category-tile.large {
  grid-row: span 2;
  min-height: 408px;
}

.category-tile.wide {
  grid-column: span 2;
}

.category-tile img,
.category-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.category-tile img {
  object-fit: cover;
  transition: transform 0.35s ease;
}

.category-tile:hover img {
  transform: scale(1.05);
}

.category-shade {
  background: linear-gradient(180deg, transparent 35%, rgba(0, 0, 0, 0.68));
}

.category-copy {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 18px;
}

.category-copy strong {
  display: block;
  font-size: 21px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.category-copy small {
  display: block;
  margin-top: 3px;
  color: rgba(255, 255, 255, 0.78);
}

@media (max-width: 768px) {
  .category-tile,
  .category-tile.large,
  .category-tile.wide {
    grid-column: auto;
    grid-row: auto;
    min-height: 168px;
  }
}
</style>
