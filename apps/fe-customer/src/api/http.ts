import axios, { type AxiosError, type AxiosResponse } from "axios";

const isLocalNetworkHost = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

export const getStoreSlug = () => {
  if (typeof window === "undefined") return null;

  const configuredSlug = import.meta.env.VITE_STORE_SLUG as string | undefined;
  if (configuredSlug) return configuredSlug;

  const hostname = window.location.hostname;
  const parts = hostname.split(".");

  if (parts.length >= 2 && parts[0] && parts[0] !== "localhost" && parts[0] !== "www") {
    return parts[0];
  }

  return null;
};

export const getApiBaseUrl = () => {
  const hardBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (hardBaseUrl) return hardBaseUrl;

  const localBaseUrl = import.meta.env.VITE_API_URL as string | undefined;
  const lanBaseUrl = import.meta.env.VITE_API_URL_T as string | undefined;
  const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";

  if (!getStoreSlug()) {
    const preferredBaseUrl =
      isLocalNetworkHost(currentHostname) && !/^localhost|127\.0\.0\.1$/i.test(currentHostname)
        ? lanBaseUrl || localBaseUrl
        : localBaseUrl || lanBaseUrl;

    if (preferredBaseUrl) {
      try {
        const url = new URL(preferredBaseUrl, typeof window !== "undefined" ? window.location.origin : undefined);
        if (isLocalNetworkHost(currentHostname) && isLocalNetworkHost(url.hostname)) {
          url.hostname = currentHostname;
        }
        return url.toString().replace(/\/$/, "");
      } catch {
        return preferredBaseUrl;
      }
    }
  }

  const storeSlug = getStoreSlug();
  const configuredBaseUrl = localBaseUrl;
  if (configuredBaseUrl && !storeSlug) return configuredBaseUrl;

  const apiPort = (import.meta.env.VITE_API_PORT as string | undefined) || "8080";

  if (storeSlug) {
    return `http://${storeSlug}.localhost:${apiPort}/api`;
  }

  return `http://localhost:${apiPort}/api`;
};

export const isMockFallbackEnabled = () =>
  import.meta.env.VITE_ENABLE_MOCK_FALLBACK === "true" && !getStoreSlug();

const shouldSendTenantHeader = () => {
  const storeSlug = getStoreSlug();
  if (!storeSlug) return false;

  try {
    const apiHost = new URL(getApiBaseUrl()).hostname;
    return !apiHost.startsWith(`${storeSlug}.`);
  } catch {
    return true;
  }
};

export interface ApiEnvelope<T> {
  status?: number;
  success?: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "customer_user";

const clearStoredCustomerSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const storeSlug = getStoreSlug();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (storeSlug && shouldSendTenantHeader()) {
    config.headers["X-Tenant-Slug"] = storeSlug;
    config.headers["X-Store-Slug"] = storeSlug;
  }

  return config;
});

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processRefreshQueue = (error: unknown, token: string | null = null) => {
  refreshQueue.forEach((item) => {
    if (error) item.reject(error);
    else item.resolve(token!);
  });
  refreshQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes("/storefront/auth/refresh")) {
      clearStoredCustomerSession();
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      clearStoredCustomerSession();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await refreshClient.post("/storefront/auth/refresh", { refreshToken });
      const nextSession = response.data?.data;
      const nextAccessToken = nextSession?.accessToken as string | undefined;
      const nextRefreshToken = nextSession?.refreshToken as string | undefined;

      if (!nextAccessToken || !nextRefreshToken) {
        throw new Error("Invalid customer refresh response");
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
      if (nextSession.user) localStorage.setItem(USER_KEY, JSON.stringify(nextSession.user));

      processRefreshQueue(null, nextAccessToken);
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processRefreshQueue(refreshError);
      clearStoredCustomerSession();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const unwrapApiData = <T>(response: AxiosResponse<ApiEnvelope<T>>) => response.data.data as T;
