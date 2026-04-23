import { defineStore } from "pinia";
import { computed, ref } from "vue";
import api from "@/services/api";

export interface MerchantUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  store_name: string;
  business_type: string;
}

interface MerchantProfileResponse {
  user: MerchantUser;
  tenant: Tenant;
}

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string | null>(localStorage.getItem("accessToken"));
  const user = ref<MerchantUser | null>(
    JSON.parse(localStorage.getItem("user") || "null"),
  );
  const tenant = ref<Tenant | null>(
    JSON.parse(localStorage.getItem("tenant") || "null"),
  );
  const isHydrating = ref(false);
  const hasBootstrapped = ref(false);
  let bootstrapPromise: Promise<boolean> | null = null;

  function decodeJwtPayload(token: string | null): Record<string, any> | null {
    if (!token) return null;

    try {
      const [, payload] = token.split(".");
      if (!payload) return null;

      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const normalized = decodeURIComponent(
        atob(base64)
          .split("")
          .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
          .join(""),
      );

      return JSON.parse(normalized);
    } catch {
      return null;
    }
  }

  function isAccessTokenExpired(skewSeconds = 30) {
    if (!accessToken.value) return true;

    const payload = decodeJwtPayload(accessToken.value);
    const exp = typeof payload?.exp === "number" ? payload.exp : null;
    if (!exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return exp <= now + skewSeconds;
  }

  const isAuthenticated = computed(() => !!accessToken.value);
  const hasValidAccessToken = computed(
    () => !!accessToken.value && !isAccessTokenExpired(),
  );

  function setAccessToken(token: string | null) {
    accessToken.value = token;

    if (token) {
      localStorage.setItem("accessToken", token);
      return;
    }

    localStorage.removeItem("accessToken");
  }

  function setProfile(profile: MerchantProfileResponse | null) {
    user.value = profile?.user ?? null;
    tenant.value = profile?.tenant ?? null;

    if (profile?.user) {
      localStorage.setItem("user", JSON.stringify(profile.user));
    } else {
      localStorage.removeItem("user");
    }

    if (profile?.tenant) {
      localStorage.setItem("tenant", JSON.stringify(profile.tenant));
    } else {
      localStorage.removeItem("tenant");
    }
  }

  function setSession(session: {
    accessToken: string;
    user: MerchantUser;
    tenant: Tenant;
  }) {
    setAccessToken(session.accessToken);
    setProfile({
      user: session.user,
      tenant: session.tenant,
    });
  }

  async function login(email: string, password: string) {
    const { data } = await api.post("/merchant/auth/login-global", {
      email,
      password,
    });

    setSession(data.data);
    hasBootstrapped.value = true;
  }

  async function fetchProfile() {
    const { data } = await api.get("/merchant/profile");
    setProfile(data.data);
    return data.data as MerchantProfileResponse;
  }

  async function refreshAccessToken() {
    const { data } = await api.post("/merchant/auth/refresh");
    const nextAccessToken = data.data.accessToken as string;
    setAccessToken(nextAccessToken);
    return nextAccessToken;
  }

  async function bootstrapAuth(force = false) {
    if (bootstrapPromise && !force) {
      return bootstrapPromise;
    }

    if (hasBootstrapped.value && !force) {
      return isAuthenticated.value;
    }

    bootstrapPromise = (async () => {
      isHydrating.value = true;

      try {
        if (accessToken.value && !isAccessTokenExpired()) {
          try {
            await fetchProfile();
            return true;
          } catch {
            clearAuth();
          }
        }

        try {
          await refreshAccessToken();
          await fetchProfile();
          return true;
        } catch {
          clearAuth();
          return false;
        }
      } finally {
        hasBootstrapped.value = true;
        isHydrating.value = false;
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  }

  async function logout() {
    try {
      await api.post("/merchant/auth/logout");
    } catch {
      // ignore
    }
    clearAuth();
  }

  function clearAuth() {
    setAccessToken(null);
    setProfile(null);
  }

  return {
    accessToken,
    user,
    tenant,
    isAuthenticated,
    hasValidAccessToken,
    isHydrating,
    hasBootstrapped,
    isAccessTokenExpired,
    setAccessToken,
    setProfile,
    setSession,
    login,
    fetchProfile,
    refreshAccessToken,
    bootstrapAuth,
    logout,
    clearAuth,
  };
});
