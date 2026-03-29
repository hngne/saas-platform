<script setup lang="ts">
const props = defineProps<{
  status: string
}>()

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  // Active/Inactive
  active: { label: 'Hoạt động', color: '#10B981', bg: '#ECFDF5' },
  inactive: { label: 'Ngừng', color: '#6B7280', bg: '#F3F4F6' },
  // Order status
  PENDING: { label: 'Chờ xử lý', color: '#F59E0B', bg: '#FFFBEB' },
  PROCESSING: { label: 'Đang xử lý', color: '#3B82F6', bg: '#EFF6FF' },
  SHIPPED: { label: 'Đang giao', color: '#8B5CF6', bg: '#F5F3FF' },
  DELIVERED: { label: 'Đã giao', color: '#10B981', bg: '#ECFDF5' },
  CANCELLED: { label: 'Đã hủy', color: '#EF4444', bg: '#FEF2F2' },
  // Payment status
  PAID: { label: 'Đã thanh toán', color: '#10B981', bg: '#ECFDF5' },
  FAILED: { label: 'Thất bại', color: '#EF4444', bg: '#FEF2F2' },
  REFUNDED: { label: 'Hoàn tiền', color: '#6366F1', bg: '#EEF2FF' },
  // Payment method
  COD: { label: 'COD', color: '#F59E0B', bg: '#FFFBEB' },
  VNPAY: { label: 'VNPay', color: '#3B82F6', bg: '#EFF6FF' },
  // Inventory type
  IN: { label: 'Nhập kho', color: '#10B981', bg: '#ECFDF5' },
  OUT: { label: 'Xuất kho', color: '#EF4444', bg: '#FEF2F2' },
  ADJUST: { label: 'Điều chỉnh', color: '#F59E0B', bg: '#FFFBEB' },
  RETURN: { label: 'Trả hàng', color: '#8B5CF6', bg: '#F5F3FF' },
  // Voucher type
  FIXED: { label: 'Cố định', color: '#3B82F6', bg: '#EFF6FF' },
  PERCENT: { label: 'Phần trăm', color: '#F59E0B', bg: '#FFFBEB' },
}

const info = statusMap[props.status] || { label: props.status, color: '#6B7280', bg: '#F3F4F6' }
</script>

<template>
  <span
    class="status-badge"
    :style="{ color: info.color, backgroundColor: info.bg }"
  >
    {{ info.label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
</style>
