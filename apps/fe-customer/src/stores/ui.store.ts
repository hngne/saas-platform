import { defineStore } from "pinia";

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = defineStore("customer-ui", {
  state: () => ({
    toastMessage: "",
    toastVisible: false,
  }),
  actions: {
    showToast(message: string, duration = 2800) {
      this.toastMessage = message;
      this.toastVisible = true;

      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        this.hideToast();
      }, duration);
    },
    hideToast() {
      this.toastVisible = false;
    },
  },
});
