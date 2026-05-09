import { getStoreSlug } from "@/api/http";
import { store } from "@/data/storefront";
import { useShopStore } from "@/stores/shop.store";

export const getStoreDisplayName = () => {
  // Try to use the API-fetched store name from the shop store first
  try {
    const shopStore = useShopStore();
    if (shopStore.profile?.store_name) {
      return shopStore.profile.store_name;
    }
  } catch (e) {
    // Pinia might not be initialized yet in some contexts
  }

  const slug = getStoreSlug();
  if (!slug) return store.name;

  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
