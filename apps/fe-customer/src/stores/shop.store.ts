import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { getStoreSlug } from "@/api/http";
import { storefrontApi } from "@/api/storefront";

export interface ShopProfile {
  slug: string;
  store_name: string;
  store_description: string;
  logo_url: string;
  favicon_url: string;
  banner_url: string;
  primary_color: string;
  secondary_color: string;
  phone: string;
  email: string;
  address: string;
  homepage_sections: string;
}

export interface ShopBanner {
  image: string;
  href: string;
}

export const useShopStore = defineStore("shop", () => {
  const profile = ref<ShopProfile | null>(null);
  const loaded = ref(false);

  const normalizeHex = (value?: string | null) => {
    const color = value?.trim();
    if (!color) return "";
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : "";
  };

  const expandHex = (value: string) => {
    const hex = value.replace("#", "");
    if (hex.length !== 3) return hex;
    return hex
      .split("")
      .map((char) => char + char)
      .join("");
  };

  const hexToRgb = (value: string) => {
    const numberValue = Number.parseInt(expandHex(value), 16);
    if (!Number.isFinite(numberValue)) return null;
    return {
      r: (numberValue >> 16) & 255,
      g: (numberValue >> 8) & 255,
      b: numberValue & 255,
    };
  };

  const mixWithBlack = (value: string, amount = 0.16) => {
    const rgb = hexToRgb(value);
    if (!rgb) return value;
    const mix = (channel: number) => Math.round(channel * (1 - amount));
    return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
  };

  const withAlpha = (value: string, alpha = 0.12) => {
    const rgb = hexToRgb(value);
    if (!rgb) return value;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  };

  const themeStyle = computed<Record<string, string>>(() => {
    const primary = normalizeHex(profile.value?.primary_color);
    const secondary = normalizeHex(profile.value?.secondary_color);
    const style: Record<string, string> = {};

    if (primary) {
      style["--sf-primary"] = primary;
      style["--sf-primary-strong"] = mixWithBlack(primary);
      style["--sf-primary-soft"] = withAlpha(primary);
    }

    if (secondary) {
      style["--sf-accent"] = secondary;
    }

    return style;
  });

  async function fetchProfile() {
    if (loaded.value) return;
    try {
      profile.value = await storefrontApi.getShopProfile();
      applyTheme();
      applyFavicon();
    } catch {
      profile.value = null;
    } finally {
      loaded.value = true;
    }
  }

  function applyTheme() {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(themeStyle.value)) {
      root.style.setProperty(key, value);
    }

    if (profile.value?.store_name) {
      document.title = profile.value.store_name;
    }
  }

  function applyFavicon() {
    if (!profile.value?.favicon_url) return;

    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    link.href = profile.value.favicon_url;
  }

  function getStoreName() {
    if (profile.value?.store_name) return profile.value.store_name;

    const slug = profile.value?.slug || getStoreSlug() || "";
    return slug
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  const normalizeBanner = (value: unknown): ShopBanner | null => {
    if (typeof value === "string") {
      const image = value.trim();
      return image ? { image, href: "" } : null;
    }

    if (!value || typeof value !== "object") return null;

    const item = value as { image?: unknown; url?: unknown; href?: unknown; link?: unknown };
    const image = String(item.image || item.url || "").trim();
    const href = String(item.href || item.link || "").trim();
    return image ? { image, href } : null;
  };

  function getBanners(): ShopBanner[] {
    const bannerValue = profile.value?.banner_url?.trim();
    if (!bannerValue) return [];

    try {
      const parsed = JSON.parse(bannerValue);
      const rawItems = Array.isArray(parsed) ? parsed : [parsed];
      return rawItems
        .map(normalizeBanner)
        .filter((item): item is ShopBanner => Boolean(item));
    } catch {
      return [{ image: bannerValue, href: "" }];
    }
  }

  function getHomepageSections() {
    const raw = profile.value?.homepage_sections?.trim();
    if (!raw) return { promo: null, service: null };
    try {
      const parsed = JSON.parse(raw);
      return {
        promo: parsed.promo || null,
        service: parsed.service || null,
      };
    } catch {
      return { promo: null, service: null };
    }
  }

  return {
    profile,
    loaded,
    themeStyle,
    fetchProfile,
    getStoreName,
    getBanners,
    getHomepageSections,
    applyTheme,
  };
});
