import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/services/api";

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
}

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string | null>(
    localStorage.getItem("accessToken"),
  );
  const admin = ref<AdminProfile | null>(
    JSON.parse(localStorage.getItem("admin") || "null"),
  );
  const isHydrating = ref(false);
  const hasBootstrapped = ref(false);
  let bootstrapPromise: Promise<boolean> | null = null;

  const isAuthenticated = () => !!accessToken.value;

  function setAccessToken(token: string | null) {
    accessToken.value = token;

    if (token) {
      localStorage.setItem("accessToken", token);
      return;
    }

    localStorage.removeItem("accessToken");
  }

  function setAdminProfile(profile: AdminProfile | null) {
    admin.value = profile;

    if (profile) {
      localStorage.setItem("admin", JSON.stringify(profile));
      return;
    }

    localStorage.removeItem("admin");
  }

  function setSession(session: { accessToken: string; admin: AdminProfile }) {
    setAccessToken(session.accessToken);
    setAdminProfile(session.admin);
  }

  async function login(email: string, password: string) {
    const { data } = await api.post("/admin/auth/login", { email, password });
    setSession(data.data);
    hasBootstrapped.value = true;
  }

  async function fetchProfile() {
    const { data } = await api.get("/admin/profile");
    setAdminProfile(data.data);
    return data.data as AdminProfile;
  }

  async function refreshAccessToken() {
    const { data } = await api.post("/admin/auth/refresh");
    const nextAccessToken = data.data.accessToken as string;
    setAccessToken(nextAccessToken);
    return nextAccessToken;
  }

  async function bootstrapAuth(force = false) {
    if (bootstrapPromise && !force) {
      return bootstrapPromise;
    }

    if (hasBootstrapped.value && !force) {
      return isAuthenticated();
    }

    bootstrapPromise = (async () => {
      isHydrating.value = true;

      try {
        if (accessToken.value) {
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
      await api.post("/admin/auth/logout");
    } catch {
      // ignore
    }
    clearAuth();
  }

  function clearAuth() {
    setAccessToken(null);
    setAdminProfile(null);
  }

  return {
    accessToken,
    admin,
    isHydrating,
    hasBootstrapped,
    isAuthenticated,
    setAccessToken,
    setAdminProfile,
    setSession,
    login,
    fetchProfile,
    refreshAccessToken,
    bootstrapAuth,
    logout,
    clearAuth,
  };
});
