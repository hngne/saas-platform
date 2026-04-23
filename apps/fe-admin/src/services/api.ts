import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";

const isLocalNetworkHost = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

const resolveBaseURL = () => {
  const rawBaseURL =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_URL_T ||
    "http://localhost:8080/api";

  if (typeof window === "undefined") return rawBaseURL;

  try {
    const url = new URL(rawBaseURL, window.location.origin);
    const currentHostname = window.location.hostname;
    const apiHostname = url.hostname;

    if (
      isLocalNetworkHost(currentHostname) &&
      isLocalNetworkHost(apiHostname)
    ) {
      url.hostname = currentHostname;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return rawBaseURL;
  }
};

const api = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  const token = authStore.accessToken || localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const redirectToLogin = () => {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

const processQueue = (error: any, token: string | null = null) => {
  refreshQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes("/admin/auth/refresh")) {
        const authStore = useAuthStore();
        authStore.clearAuth();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post("/admin/auth/refresh");
        const newAccessToken = data.data.accessToken;
        const authStore = useAuthStore();
        authStore.setAccessToken(newAccessToken);

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        const authStore = useAuthStore();
        authStore.clearAuth();
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
