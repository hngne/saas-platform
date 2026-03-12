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
  const admin = ref<AdminProfile | null>(null);

  const isAuthenticated = () => !!accessToken.value;

  async function login(email: string, password: string) {
    const { data } = await api.post("/admin/auth/login", { email, password });
    accessToken.value = data.data.accessToken;
    admin.value = data.data.admin;
    localStorage.setItem("accessToken", data.data.accessToken);
  }

  async function fetchProfile() {
    const { data } = await api.get("/admin/profile");
    admin.value = data.data;
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
    accessToken.value = null;
    admin.value = null;
    localStorage.removeItem("accessToken");
  }

  return { accessToken, admin, isAuthenticated, login, fetchProfile, logout, clearAuth };
});
