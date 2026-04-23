import { getStoreSlug } from "@/api/http";
import { store } from "@/data/storefront";

export const getStoreDisplayName = () => {
  const slug = getStoreSlug();
  if (!slug) return store.name;

  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
