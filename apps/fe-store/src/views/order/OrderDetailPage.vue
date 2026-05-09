<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import EmptyState from '@/components/ui/EmptyState.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useAppToast } from '@/composables/useToast'
import { orderService, type Order, type OrderStatus, type UpdateOrderStatusDto } from '@/services/order.service'
import { formatDateTime, formatVND } from '@/utils/format'
import { useNotificationStore } from '@/stores/notification.store'

type ActionTone = 'primary' | 'danger'

interface StatusAction {
  label: string
  status: UpdateOrderStatusDto['order_status']
  tone: ActionTone
  icon: string
}

const route = useRoute()
const router = useRouter()
const toast = useAppToast()
const notificationStore = useNotificationStore()

const loading = ref(true)
const order = ref<Order | null>(null)
const statusNote = ref('')
const updatingStatus = ref<UpdateOrderStatusDto['order_status'] | ''>('')

const isPickup = computed(() => !!order.value?.pickup_store_name)

const deliverySteps = [
  { key: 'PENDING', label: 'Chờ xử lý', icon: 'pi pi-check' },
  { key: 'PROCESSING', label: 'Đã xác nhận', icon: 'pi pi-box' },
  { key: 'SHIPPED', label: 'Đang giao', icon: 'pi pi-truck' },
  { key: 'DELIVERED', label: 'Đã giao', icon: 'pi pi-home' },
] as const

const pickupSteps = [
  { key: 'PENDING', label: 'Chờ xử lý', icon: 'pi pi-check' },
  { key: 'PROCESSING', label: 'Đã xác nhận', icon: 'pi pi-box' },
  { key: 'DELIVERED', label: 'Đã nhận hàng', icon: 'pi pi-home' },
] as const

const progressSteps = computed(() => isPickup.value ? pickupSteps : deliverySteps)

const deliveryIndexMap: Record<string, number> = {
  PENDING: 0, PROCESSING: 1, SHIPPED: 2, DELIVERED: 3, COMPLETED: 3,
}
const pickupIndexMap: Record<string, number> = {
  PENDING: 0, PROCESSING: 1, DELIVERED: 2, COMPLETED: 2,
}

const progressStatus = computed(() => {
  if (!order.value || order.value.order_status === 'CANCELLED') return 'PENDING'
  return order.value.order_status
})

const currentProgressIndex = computed(() => {
  const map = isPickup.value ? pickupIndexMap : deliveryIndexMap
  return map[progressStatus.value] ?? 0
})

const availableActions = computed<StatusAction[]>(() => {
  if (!order.value) return []

  if (isPickup.value) {
    const pickupActions: Record<OrderStatus, StatusAction[]> = {
      PENDING: [
        { label: 'Xác nhận đơn', status: 'PROCESSING', tone: 'primary', icon: 'pi pi-check-circle' },
        { label: 'Hủy đơn', status: 'CANCELLED', tone: 'danger', icon: 'pi pi-times' },
      ],
      PROCESSING: [
        { label: 'Xác nhận đã nhận hàng', status: 'DELIVERED', tone: 'primary', icon: 'pi pi-home' },
        { label: 'Hủy đơn', status: 'CANCELLED', tone: 'danger', icon: 'pi pi-times' },
      ],
      SHIPPED: [],
      DELIVERED: [],
      COMPLETED: [],
      CANCELLED: [],
    }
    return pickupActions[order.value.order_status] || []
  }

  const actionMap: Record<OrderStatus, StatusAction[]> = {
    PENDING: [
      { label: 'Xác nhận đơn', status: 'PROCESSING', tone: 'primary', icon: 'pi pi-check-circle' },
      { label: 'Hủy đơn', status: 'CANCELLED', tone: 'danger', icon: 'pi pi-times' },
    ],
    PROCESSING: [
      { label: 'Bắt đầu giao', status: 'SHIPPED', tone: 'primary', icon: 'pi pi-send' },
      { label: 'Hủy đơn', status: 'CANCELLED', tone: 'danger', icon: 'pi pi-times' },
    ],
    SHIPPED: [
      { label: 'Xác nhận đã giao', status: 'DELIVERED', tone: 'primary', icon: 'pi pi-home' },
    ],
    DELIVERED: [],
    COMPLETED: [],
    CANCELLED: [],
  }

  return actionMap[order.value.order_status] || []
})

const deliveredFinal = computed(() => order.value?.order_status === 'DELIVERED')

const shippingMethodLabel = computed(() => {
  if (!order.value) return 'Chưa cấu hình'
  if (order.value.pickup_store_name) return order.value.pickup_store_name
  return order.value.shipping_method_name || 'Chưa gán phương thức'
})

const shippingMethodTypeLabel = computed(() => {
  if (!order.value) return 'N/A'
  if (order.value.shipping_method_type === 'PICKUP' || order.value.pickup_store_name) return 'Nhận tại cửa hàng'
  return 'Giao tận nơi'
})

const paymentMeta = computed(() => {
  if (!order.value) return ''
  if (order.value.payment_status === 'PAID') return 'Đã thanh toán'
  if (order.value.payment_status === 'FAILED') return 'Thanh toán lỗi'
  if (order.value.payment_status === 'EXPIRED') return 'Quá hạn thanh toán'
  if (order.value.payment_status === 'REFUNDED') return 'Đã hoàn tiền'
  return order.value.payment_method === 'COD' ? 'Thu tiền khi giao hàng' : 'Chờ thanh toán online'
})

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'KH'
}

const fetchOrder = async () => {
  loading.value = true
  try {
    const { data } = await orderService.getById(route.params.id as string)
    order.value = data.data
  } catch {
    toast.error('Không thể tải chi tiết đơn hàng')
    router.push('/orders')
  } finally {
    loading.value = false
  }
}

const handleStatusUpdate = async (targetStatus: UpdateOrderStatusDto['order_status']) => {
  if (!order.value) return

  updatingStatus.value = targetStatus
  try {
    await orderService.updateStatus(order.value.id, {
      order_status: targetStatus,
      note: statusNote.value || undefined,
    })
    toast.success('Đã cập nhật trạng thái đơn hàng')
    statusNote.value = ''
    await fetchOrder()
  } catch (error: any) {
    toast.error('Cập nhật thất bại', error?.response?.data?.message || 'Không thể thay đổi trạng thái đơn hàng')
  } finally {
    updatingStatus.value = ''
  }
}

const handleOrderUpdated = (data: any) => {
  if (data.orderId === route.params.id) {
    fetchOrder()
    toast.info('Trạng thái đơn hàng vừa có cập nhật mới')
  }
}

onMounted(() => {
  fetchOrder()
  if (notificationStore.socket) {
    notificationStore.socket.on('order:updated', handleOrderUpdated)
  }
})

onUnmounted(() => {
  if (notificationStore.socket) {
    notificationStore.socket.off('order:updated', handleOrderUpdated)
  }
})

watch(() => notificationStore.socket, (newSocket, oldSocket) => {
  if (oldSocket) oldSocket.off('order:updated', handleOrderUpdated)
  if (newSocket) newSocket.on('order:updated', handleOrderUpdated)
})
</script>

<template>
  <div v-if="loading" class="detail-loading">
    <i class="pi pi-spin pi-spinner"></i>
  </div>

  <div v-else-if="!order" class="detail-empty">
    <EmptyState
      icon="pi pi-receipt"
      title="Không tìm thấy đơn hàng"
      description="Đơn hàng có thể đã bị xóa hoặc không thuộc shop hiện tại."
    >
      <div class="empty-actions">
        <Button label="Quay lại danh sách" icon="pi pi-arrow-left" @click="router.push('/orders')" />
      </div>
    </EmptyState>
  </div>

  <div v-else class="order-detail-page">
    <section class="hero-card">
      <div class="hero-head">
        <Button icon="pi pi-arrow-left" text rounded @click="router.push('/orders')" />
        <div class="hero-title">
          <h1>Đơn #{{ order.order_code }}</h1>
          <p>Đặt lúc {{ formatDateTime(order.created_at) }}</p>
        </div>
        <StatusBadge :status="order.order_status" />
      </div>

      <div v-if="order.order_status === 'CANCELLED'" class="state-banner danger">
        <i class="pi pi-info-circle"></i>
        <span>Đơn đã hủy. Tồn kho và voucher đã được hoàn về theo nghiệp vụ hiện tại.</span>
      </div>

      <div v-else-if="deliveredFinal && isPickup" class="state-banner success">
        <i class="pi pi-check-circle"></i>
        <span>Khách đã nhận hàng tại cửa hàng. Nếu là COD, hệ thống đã ghi nhận thanh toán.</span>
      </div>

      <div v-else-if="deliveredFinal" class="state-banner success">
        <i class="pi pi-check-circle"></i>
        <span>Đơn đã giao cho khách. Nếu là COD, hệ thống đã ghi nhận thanh toán khi chuyển sang đã giao.</span>
      </div>

      <div class="progress-grid">
        <div class="timeline" :style="{ gridTemplateColumns: `repeat(${progressSteps.length}, minmax(0, 1fr))` }">
          <div
            v-for="(step, index) in progressSteps"
            :key="step.key"
            class="timeline-step"
            :class="{
              completed: index < currentProgressIndex && order.order_status !== 'CANCELLED',
              current: index === currentProgressIndex && order.order_status !== 'CANCELLED',
              muted: order.order_status === 'CANCELLED',
            }"
          >
            <div class="step-node"><i :class="step.icon"></i></div>
            <span>{{ step.label }}</span>
          </div>
        </div>

        <div class="action-panel">
          <div v-if="availableActions.length" class="action-list">
            <Button
              v-for="action in availableActions"
              :key="action.status"
              :label="action.label"
              :icon="action.icon"
              :severity="action.tone === 'danger' ? 'danger' : undefined"
              :outlined="action.tone === 'danger'"
              :loading="updatingStatus === action.status"
              @click="handleStatusUpdate(action.status)"
            />
          </div>

          <div v-else class="action-placeholder">
            <strong>Không còn thao tác tiếp theo từ phía shop.</strong>
            <span v-if="deliveredFinal">Đơn đã ở trạng thái đã giao.</span>
            <span v-else>Đơn đã ở trạng thái cuối.</span>
          </div>

          <div class="note-panel">
            <label for="status-note">Ghi chú xử lý</label>
            <Textarea
              id="status-note"
              v-model="statusNote"
              rows="3"
              autoResize
              placeholder="Ví dụ: đã gọi xác nhận khách, đã bàn giao cho ship..."
            />
            <p>Ghi chú này sẽ được gửi cùng lần cập nhật trạng thái tiếp theo.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="detail-grid">
      <div class="detail-main">
        <article class="detail-card">
          <div class="card-head">
            <div>
              <p class="card-eyebrow">Order Items</p>
              <h2>Sản phẩm trong đơn</h2>
            </div>
            <span class="card-chip">{{ order.item_count }} sản phẩm</span>
          </div>

          <div class="items-table">
            <div class="items-head">
              <div>Sản phẩm</div>
              <div>SKU</div>
              <div>SL</div>
              <div>Đơn giá</div>
              <div>Thành tiền</div>
            </div>

            <div v-for="item in order.items" :key="item.id" class="item-row">
              <div class="item-product">
                <div class="item-thumb">
                  <img v-if="item.image_url" :src="item.image_url" :alt="item.product_name" />
                  <i v-else class="pi pi-image"></i>
                </div>
                <div class="item-copy">
                  <strong>{{ item.product_name }}</strong>
                  <span>{{ item.variant_info || 'Biến thể mặc định' }}</span>
                </div>
              </div>
              <div><strong>{{ item.sku_code || 'N/A' }}</strong></div>
              <div><strong>{{ item.quantity }}</strong></div>
              <div><strong>{{ formatVND(item.unit_price) }}</strong></div>
              <div><strong>{{ formatVND(item.subtotal) }}</strong></div>
            </div>
          </div>
        </article>

        <article class="detail-card">
          <div class="card-head">
            <div>
              <p class="card-eyebrow">Order Summary</p>
              <h2>Tổng kết thanh toán</h2>
            </div>
            <div class="badge-row">
              <StatusBadge :status="order.payment_method" />
              <StatusBadge :status="order.payment_status" />
            </div>
          </div>

          <div class="summary-rows">
            <div class="summary-row">
              <span>Tạm tính</span>
              <strong>{{ formatVND(order.subtotal) }}</strong>
            </div>
            <div class="summary-row">
              <span>Phí vận chuyển</span>
              <strong>{{ formatVND(order.shipping_fee) }}</strong>
            </div>
            <div v-if="order.discount_amount > 0" class="summary-row discount-row">
              <span>Giảm giá</span>
              <strong>-{{ formatVND(order.discount_amount) }}</strong>
            </div>
            <div class="summary-row total-row">
              <span>Tổng thanh toán</span>
              <strong>{{ formatVND(order.total_amount) }}</strong>
            </div>
          </div>

          <div class="payment-meta">
            <div>
              <span>Thanh toán</span>
              <strong>{{ paymentMeta }}</strong>
            </div>
            <div v-if="order.payment_transaction_id">
              <span>Mã giao dịch</span>
              <strong>{{ order.payment_transaction_id }}</strong>
            </div>
            <div v-if="order.payment_paid_at">
              <span>Thời điểm thanh toán</span>
              <strong>{{ formatDateTime(order.payment_paid_at) }}</strong>
            </div>
          </div>
        </article>
      </div>

      <aside class="detail-side">
        <article class="side-card">
          <div class="side-head">
            <i class="pi pi-user"></i>
            <h3>Khách hàng</h3>
          </div>

          <div class="customer-profile">
            <div class="customer-photo">{{ getInitials(order.customer_name) }}</div>
            <div>
              <strong>{{ order.customer_name }}</strong>
              <p>{{ order.customer_email || 'Không có email' }}</p>
            </div>
          </div>

          <div class="info-list">
            <div class="info-row">
              <span>Số điện thoại</span>
              <strong>{{ order.customer_phone || '—' }}</strong>
            </div>
            <div class="info-row">
              <span>Phương thức thanh toán</span>
              <strong>{{ order.payment_method === 'VNPAY' ? 'VNPay' : 'COD' }}</strong>
            </div>
            <div class="info-row">
              <span>Trạng thái hiện tại</span>
              <strong>{{ order.order_status }}</strong>
            </div>
          </div>
        </article>

        <article class="side-card">
          <div class="side-head">
            <i class="pi pi-map-marker"></i>
            <h3>Vận chuyển</h3>
          </div>

          <div class="shipping-highlight">
            <strong>{{ shippingMethodLabel }}</strong>
            <p>{{ shippingMethodTypeLabel }}</p>
          </div>

          <div class="address-box">
            <p>{{ order.shipping_address || 'Chưa có địa chỉ giao hàng' }}</p>
          </div>

          <div v-if="order.pickup_store_name" class="pickup-box">
            <strong>{{ order.pickup_store_name }}</strong>
            <p>{{ order.pickup_store_address || 'Chưa có địa chỉ cửa hàng nhận' }}</p>
            <p v-if="order.pickup_store_phone">{{ order.pickup_store_phone }}</p>
          </div>
        </article>

        <article class="side-card">
          <div class="side-head">
            <i class="pi pi-file-edit"></i>
            <h3>Ghi chú nội bộ</h3>
          </div>
          <div class="note-box">
            <p v-if="order.note">{{ order.note }}</p>
            <p v-else>Chưa có ghi chú nào được lưu cho đơn hàng này.</p>
          </div>
        </article>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.detail-loading,
.detail-empty {
  display: flex;
  justify-content: center;
  padding: 72px 16px;
}

.detail-loading i {
  font-size: 2rem;
  color: var(--primary);
}

.empty-actions {
  margin-top: 16px;
}

.order-detail-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero-card,
.detail-card,
.side-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 251, 247, 0.93));
  border: 1px solid #edf2f7;
  border-radius: 28px;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.04);
}

.hero-card,
.detail-card,
.side-card {
  padding: 24px;
}

.hero-head,
.card-head,
.side-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.hero-title h1 {
  margin: 0;
  font-size: var(--page-title-size);
  font-weight: 800;
  letter-spacing: var(--page-title-letter-spacing);
  color: #111827;
}

.hero-title p {
  margin: 6px 0 0;
  color: #64748b;
}

.state-banner {
  margin-top: 18px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 16px;
  border-radius: 18px;
}

.state-banner.warning {
  background: #fff7ed;
  border: 1px solid #fdba74;
  color: #c2410c;
}

.state-banner.success {
  background: #ecfdf5;
  border: 1px solid #86efac;
  color: #047857;
}

.state-banner.danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.progress-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) 360px;
  gap: 24px;
}

.timeline {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  position: relative;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 7%;
  right: 7%;
  top: 22px;
  height: 4px;
  border-radius: 999px;
  background: #e2e8f0;
}

.timeline-step {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  text-align: center;
  color: #94a3b8;
  font-weight: 800;
}

.step-node {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 2px solid #dbeafe;
  background: #fff;
}

.timeline-step.completed,
.timeline-step.current {
  color: #c2410c;
}

.timeline-step.completed .step-node,
.timeline-step.current .step-node {
  border-color: #fb923c;
  color: #c2410c;
  background: #fff7ed;
}

.timeline-step.muted .step-node {
  border-color: #cbd5e1;
  color: #94a3b8;
}

.action-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.action-list {
  display: grid;
  gap: 10px;
}

.action-placeholder,
.note-panel {
  padding: 16px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #edf2f7;
}

.action-placeholder {
  display: grid;
  gap: 8px;
  color: #64748b;
}

.action-placeholder strong {
  color: #111827;
}

.note-panel label {
  display: block;
  margin-bottom: 10px;
  font-weight: 800;
}

.note-panel p {
  margin: 10px 0 0;
  color: #94a3b8;
  font-size: 0.84rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) 360px;
  gap: 24px;
}

.detail-main,
.detail-side {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card-eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  font-weight: 800;
  color: #94a3b8;
}

.card-head h2,
.side-head h3 {
  margin: 8px 0 0;
  font-size: 1.6rem;
  font-weight: 900;
  color: #111827;
}

.card-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: #fff7ed;
  color: #c2410c;
  font-weight: 800;
}

.badge-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.items-table {
  margin-top: 22px;
}

.items-head,
.item-row {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) 140px 90px 140px 160px;
  gap: 16px;
  align-items: center;
}

.items-head {
  padding-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
  color: #94a3b8;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.item-row {
  padding: 18px 0;
  border-bottom: 1px solid #f8fafc;
}

.item-product {
  display: flex;
  align-items: center;
  gap: 14px;
}

.item-thumb {
  width: 68px;
  height: 68px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #94a3b8;
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-copy strong,
.item-row strong {
  color: #0f172a;
  font-weight: 800;
}

.item-copy span {
  color: #64748b;
}

.summary-rows {
  margin-top: 22px;
  display: grid;
  gap: 14px;
}

.summary-row,
.info-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.summary-row strong,
.info-row strong {
  font-weight: 800;
  color: #111827;
}

.discount-row {
  color: #dc2626;
}

.discount-row strong {
  color: #dc2626;
}

.total-row {
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.total-row strong {
  font-size: 1.8rem;
}

.payment-meta {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #f1f5f9;
  display: grid;
  gap: 14px;
}

.payment-meta span {
  display: block;
  color: #94a3b8;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 800;
}

.payment-meta strong {
  display: block;
  margin-top: 6px;
  color: #111827;
}

.side-head {
  justify-content: flex-start;
}

.side-head i {
  color: #c2410c;
  margin-top: 6px;
}

.customer-profile {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
}

.customer-photo {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #fff1eb, #fff7ed);
  color: #c2410c;
  font-weight: 900;
}

.customer-profile strong,
.shipping-highlight strong,
.pickup-box strong {
  color: #111827;
  font-weight: 800;
}

.customer-profile p,
.shipping-highlight p,
.pickup-box p,
.address-box p,
.note-box p {
  margin: 0;
  color: #64748b;
  line-height: 1.65;
}

.info-list {
  margin-top: 18px;
  display: grid;
  gap: 12px;
}

.shipping-highlight,
.address-box,
.pickup-box,
.note-box {
  margin-top: 16px;
  padding: 16px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #edf2f7;
}

.shipping-highlight {
  background: linear-gradient(135deg, #eef2ff, #f8fafc);
}

@media (max-width: 1280px) {
  .progress-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .timeline {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .timeline::before {
    display: none;
  }

  .items-head {
    display: none;
  }

  .item-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .hero-card,
  .detail-card,
  .side-card {
    padding: 18px;
    border-radius: 22px;
  }

  .hero-head,
  .card-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .timeline {
    grid-template-columns: 1fr;
  }
}
</style>
