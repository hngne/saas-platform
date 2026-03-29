import { useToast as usePrimeToast } from 'primevue/usetoast'

export function useAppToast() {
  const toast = usePrimeToast()

  const success = (summary: string, detail?: string) => {
    toast.add({ severity: 'success', summary, detail, life: 3000 })
  }

  const error = (summary: string, detail?: string) => {
    toast.add({ severity: 'error', summary, detail, life: 5000 })
  }

  const warn = (summary: string, detail?: string) => {
    toast.add({ severity: 'warn', summary, detail, life: 4000 })
  }

  const info = (summary: string, detail?: string) => {
    toast.add({ severity: 'info', summary, detail, life: 3000 })
  }

  return { success, error, warn, info }
}
