<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { MessageCircleMore } from "lucide-vue-next";
import StorefrontLayout from "@/layouts/StorefrontLayout.vue";

const route = useRoute();
const isBarePage = computed(() => route.meta.bare === true);
const hiddenChatFabRoutes = new Set(["support-chat"]);
const showChatFab = computed(() => !hiddenChatFabRoutes.has(String(route.name || "")));
</script>

<template>
  <RouterView v-if="isBarePage" />
  <StorefrontLayout v-else>
    <RouterView />
  </StorefrontLayout>

  <RouterLink v-if="showChatFab" to="/support" class="chat-fab" aria-label="Mở trợ lý trực tuyến">
    <MessageCircleMore :size="22" />
    <span>Trợ lý</span>
  </RouterLink>
</template>

<style scoped>
.chat-fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 70;
  height: 56px;
  min-width: 56px;
  padding: 0 18px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--sf-primary), var(--sf-accent));
  color: #fff;
  box-shadow: 0 18px 34px rgba(164, 67, 8, 0.22);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 900;
}

@media (max-width: 768px) {
  .chat-fab {
    right: 16px;
    bottom: 88px;
    height: 52px;
    padding: 0 16px;
  }
}
</style>
