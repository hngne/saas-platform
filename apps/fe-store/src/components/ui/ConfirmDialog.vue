<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const props = defineProps<{
  visible: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  severity?: 'danger' | 'warn'
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: []
}>()

const close = () => emit('update:visible', false)
const confirm = () => {
  emit('confirm')
  close()
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    :header="title || 'Xác nhận'"
    modal
    :style="{ width: '420px' }"
    :closable="true"
  >
    <div class="flex items-center gap-3 py-2">
      <i
        class="pi pi-exclamation-triangle"
        :style="{ color: severity === 'danger' ? '#EF4444' : '#F59E0B', fontSize: '1.5rem' }"
      ></i>
      <span class="text-sm" style="color: var(--text-primary)">{{ message }}</span>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          :label="cancelLabel || 'Hủy'"
          severity="secondary"
          text
          @click="close"
        />
        <Button
          :label="confirmLabel || 'Xác nhận'"
          :severity="severity === 'danger' ? 'danger' : 'warn'"
          @click="confirm"
        />
      </div>
    </template>
  </Dialog>
</template>
