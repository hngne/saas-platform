import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  withCredentials: true, // gửi cookie (refreshToken)
});

// ─── Request Interceptor: gắn accessToken ──────────
api.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
});

// ─── Response Interceptor: tự động refresh token ───
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

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

    // Nếu 401 + chưa retry => thử refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Nếu chính request refresh bị lỗi => logout luôn
      if (originalRequest.url?.includes("/admin/auth/refresh")) {
        const authStore = useAuthStore();
        authStore.clearAuth();
        window.location.href = "/login";
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
        authStore.accessToken = newAccessToken;

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        const authStore = useAuthStore();
        authStore.clearAuth();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
