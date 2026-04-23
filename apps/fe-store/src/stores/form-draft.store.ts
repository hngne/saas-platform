import { defineStore } from "pinia";
import { ref, watch } from "vue";

type DraftRecord = Record<string, unknown>;

const STORAGE_KEY = "merchant-form-drafts";

export const useFormDraftStore = defineStore("form-draft", () => {
  const drafts = ref<DraftRecord>(
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
  );

  function getDraft<T>(key: string): T | null {
    return (drafts.value[key] as T | undefined) ?? null;
  }

  function setDraft<T>(key: string, value: T) {
    drafts.value[key] = value as unknown;
  }

  function clearDraft(key: string) {
    delete drafts.value[key];
  }

  watch(
    drafts,
    (value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    },
    { deep: true },
  );

  return {
    drafts,
    getDraft,
    setDraft,
    clearDraft,
  };
});
