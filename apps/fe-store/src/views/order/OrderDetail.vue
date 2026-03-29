<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderService, type Order, type UpdateOrderStatusDto } from '@/services/order.service'
import { useAppToast } from '@/composables/useToast'
import { formatVND, formatDateTime } from '@/utils/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const route = useRoute()
const router = useRouter()
const toast = useAppToast()
const loading = ref(true)
const order = ref<Order | null>(null)
const updating = ref(false)
const newStatus = ref('')
const statusNote = ref('')

const statusOptions = computed(() => {
  if (!order.value) return []
  const current = order.value.order_status
  const map: Record<string, string[]> = {
    PENDING: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  }
  return (map[current] || []).map(s => {
    const labels: Record<string, string> = { PROCESSING: 'Xử lý', SHIPPED: 'Giao hàng', DELIVERED: 'Đã giao', CANCELLED: 'Hủy đơn' }
    return { label: labels[s] || s, value: s }
  })
})

const fetchOrder = async () => {
  loading.value = true
  try {
    const { data } = await orderService.getById(route.params.id as string)
    order.value = data.data
  } catch {
    toast.error('Không thể tải đơn hàng')
    router.push('/orders')
  } finally { loading.value = false }
}

const updateStatus = async () => {
  if (!newStatus.value || !order.value) return
  updating.value = true
  try {
    const dto: UpdateOrderStatusDto = { order_status: newStatus.value as any, note: statusNote.value || undefined }
    await orderService.updateStatus(order.value.id, dto)
    toast.success('Cập nhật trạng thái thành công')
    newStatus.value = ''
    statusNote.value = ''
    fetchOrder()
  } catch (err: any) {
    toast.error('Lỗi', err.response?.data?.message || 'Cập nhật thất bại')
  } finally { updating.value = false }
}

onMounted(fetchOrder)
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
  </div>

  <div v-else-if="order" class="max-w-5xl">
    <div class="flex items-center gap-3 mb-5">
      <Button icon="pi pi-arrow-left" text rounded @click="router.push('/orders')" />
      <h2 class="text-lg font-bold" style="color: var(--text-primary)">
        Đơn hàng #{{ order.order_code || order.id.slice(0, 8) }}
      </h2>
      <StatusBadge :status="order.order_status" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
      <!-- Customer info -->
      <div class="app-card p-5 fade-in-up">
        <h4 class="text-sm font-bold mb-3"><i class="pi pi-user mr-2"></i>Khách hàng</h4>
        <div class="space-y-2 text-sm">
          <p><span style="color: var(--text-muted)">Tên:</span> <strong>{{ order.customer_name }}</strong></p>
          <p><span style="color: var(--text-muted)">SĐT:</span> {{ order.customer_phone || '—' }}</p>
          <p><span style="color: var(--text-muted)">Email:</span> {{ order.customer_email || '—' }}</p>
          <p><span style="color: var(--text-muted)">Địa chỉ:</span> {{ order.shipping_address || '—' }}</p>
        </div>
      </div>

      <!-- Payment -->
      <div class="app-card p-5 fade-in-up">
        <h4 class="text-sm font-bold mb-3"><i class="pi pi-wallet mr-2"></i>Thanh toán</h4>
        <div class="space-y-2 text-sm">
          <p class="flex justify-between"><span style="color: var(--text-muted)">Phương thức</span> <StatusBadge :status="order.payment_method" /></p>
          <p class="flex justify-between"><span style="color: var(--text-muted)">Trạng thái</span> <StatusBadge :status="order.payment_status" /></p>
          <p class="flex justify-between"><span style="color: var(--text-muted)">Voucher</span> <span>{{ order.voucher_code || '—' }}</span></p>
        </div>
      </div>

      <!-- Update status -->
      <div class="app-card p-5 fade-in-up">
        <h4 class="text-sm font-bold mb-3"><i class="pi pi-sync mr-2"></i>Cập nhật trạng thái</h4>
        <div v-if="statusOptions.length" class="flex flex-col gap-3">
          <Select v-model="newStatus" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Chọn trạng thái" class="w-full" />
          <Textarea v-model="statusNote" rows="2" placeholder="Ghi chú (tùy chọn)" class="w-full" />
          <Button label="Cập nhật" class="btn-gradient w-full" :loading="updating" :disabled="!newStatus" @click="updateStatus" />
        </div>
        <p v-else class="text-sm" style="color: var(--text-muted)">Không thể thay đổi trạng thái.</p>
      </div>
    </div>

    <!-- Items -->
    <div class="app-card p-5 fade-in-up">
      <h4 class="text-sm font-bold mb-3"><i class="pi pi-list mr-2"></i>Sản phẩm ({{ order.items?.length || 0 }})</h4>
      <DataTable :value="order.items || []" class="text-sm" stripedRows>
        <Column header="Sản phẩm" style="min-width: 250px">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <img v-if="data.image_url" :src="data.image_url" class="w-10 h-10 rounded-lg object-cover" />
              <div>
                <p class="font-semibold">{{ data.product_name }}</p>
                <p class="text-xs" style="color: var(--text-muted)">{{ data.variant_info || '' }}</p>
              </div>
            </div>
          </template>
        </Column>
        <Column header="Đơn giá" style="width: 120px"><template #body="{ data }">{{ formatVND(data.unit_price) }}</template></Column>
        <Column header="SL" field="quantity" style="width: 60px; text-align: center" />
        <Column header="Thành tiền" style="width: 130px"><template #body="{ data }"><span class="font-semibold">{{ formatVND(data.subtotal) }}</span></template></Column>
      </DataTable>

      <div class="flex justify-end mt-4">
        <div class="text-sm space-y-1 text-right" style="min-width: 200px">
          <p class="flex justify-between"><span style="color: var(--text-muted)">Tạm tính</span> <span>{{ formatVND(order.subtotal) }}</span></p>
          <p class="flex justify-between"><span style="color: var(--text-muted)">Phí ship</span> <span>{{ formatVND(order.shipping_fee) }}</span></p>
          <p v-if="order.discount_amount" class="flex justify-between"><span style="color: var(--text-muted)">Giảm giá</span> <span style="color: #10B981">-{{ formatVND(order.discount_amount) }}</span></p>
          <p class="flex justify-between font-bold text-base pt-2 border-t" style="border-color: var(--border)">
            <span>Tổng</span> <span style="color: var(--primary)">{{ formatVND(order.total_amount) }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
