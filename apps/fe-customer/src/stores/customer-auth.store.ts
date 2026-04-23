import { defineStore } from "pinia";
import {
  customerAuthApi,
  getApiErrorMessage,
  type CustomerProfile,
  type LoginPayload,
  type RegisterPayload,
} from "@/api/customer";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "customer_user";

let bootstrapPromise: Promise<boolean> | null = null;

const decodeJwtPayload = (token: string | null): Record<string, any> | null => {
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
};

const isTokenExpired = (token: string | null, skewSeconds = 30) => {
  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  if (!exp) return true;

  return exp <= Math.floor(Date.now() / 1000) + skewSeconds;
};

const readStoredUser = (): CustomerProfile | null => {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as CustomerProfile) : null;
  } catch {
    return null;
  }
};

const writeSession = (
  accessToken: string,
  refreshToken: string,
  user: CustomerProfile,
) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const useCustomerAuthStore = defineStore("customer-auth", {
  state: () => ({
    accessToken:
      typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken:
      typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(REFRESH_TOKEN_KEY),
    user: readStoredUser(),
    loading: false,
    isHydrating: false,
    hasBootstrapped: false,
    error: "",
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
    hasValidAccessToken: (state) => Boolean(state.accessToken) && !isTokenExpired(state.accessToken),
    displayName: (state) => state.user?.name || "Khách hàng",
    defaultAddress: (state) =>
      state.user?.addresses?.find((address) => address.is_default) ||
      state.user?.addresses?.[0] ||
      null,
  },
  actions: {
    hydrate() {
      this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      this.user = readStoredUser();
    },

    setSession(result: { accessToken: string; refreshToken: string; user: CustomerProfile }) {
      this.accessToken = result.accessToken;
      this.refreshToken = result.refreshToken;
      this.user = result.user;
      writeSession(result.accessToken, result.refreshToken, result.user);
    },

    clearAuth() {
      clearSession();
      this.accessToken = null;
      this.refreshToken = null;
      this.user = null;
    },

    async refreshAccessToken() {
      const refreshToken = this.refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) throw new Error("Missing refresh token");

      const result = await customerAuthApi.refresh(refreshToken);
      this.setSession(result);
      return result.accessToken;
    },

    async bootstrapAuth(force = false) {
      if (bootstrapPromise && !force) return bootstrapPromise;
      if (this.hasBootstrapped && !force) return this.isAuthenticated;

      bootstrapPromise = (async () => {
        this.isHydrating = true;
        this.hydrate();

        try {
          if (this.accessToken && !isTokenExpired(this.accessToken)) {
            await this.fetchProfile().catch(() => null);
            return true;
          }

          if (this.refreshToken) {
            await this.refreshAccessToken();
            await this.fetchProfile().catch(() => null);
            return true;
          }

          this.clearAuth();
          return false;
        } catch {
          this.clearAuth();
          return false;
        } finally {
          this.hasBootstrapped = true;
          this.isHydrating = false;
          bootstrapPromise = null;
        }
      })();

      return bootstrapPromise;
    },

    async login(payload: LoginPayload) {
      this.loading = true;
      this.error = "";
      try {
        const result = await customerAuthApi.login(payload);
        this.setSession(result);
        this.hasBootstrapped = true;
        await this.fetchProfile().catch(() => null);
      } catch (error) {
        this.error = getApiErrorMessage(error, "Đăng nhập không thành công.");
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async register(payload: RegisterPayload) {
      this.loading = true;
      this.error = "";
      try {
        await customerAuthApi.register(payload);
        await this.login({ email: payload.email, password: payload.password });
      } catch (error) {
        this.error = getApiErrorMessage(error, "Đăng ký không thành công.");
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchProfile() {
      if (!this.accessToken) return null;
      const profile = await customerAuthApi.getProfile();
      this.user = profile;
      localStorage.setItem(USER_KEY, JSON.stringify(profile));
      return profile;
    },

    async updateProfile(payload: { name?: string; phone?: string }) {
      this.loading = true;
      this.error = "";
      try {
        const profile = await customerAuthApi.updateProfile(payload);
        this.user = profile;
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
        return profile;
      } catch (error) {
        this.error = getApiErrorMessage(error, "Không thể cập nhật hồ sơ.");
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async changePassword(payload: { oldPassword: string; newPassword: string }) {
      this.loading = true;
      this.error = "";
      try {
        await customerAuthApi.changePassword(payload);
      } catch (error) {
        this.error = getApiErrorMessage(error, "Không thể đổi mật khẩu.");
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        if (this.accessToken) await customerAuthApi.logout();
      } finally {
        this.clearAuth();
        this.hasBootstrapped = false;
      }
    },
  },
});
