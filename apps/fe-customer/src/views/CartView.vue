<script setup lang="ts">
import { ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { ArrowLeft, ArrowRight, Minus, MoreHorizontal, Plus, Ticket, Trash2, X } from "lucide-vue-next";
import { formatVnd } from "@/data/storefront";
import { useCartStore } from "@/stores/cart.store";

const cart = useCartStore();
const { items, subtotal, shippingFee, discount, total, voucherCode, voucherMessage, voucherApplying } = storeToRefs(cart);
const voucherInput = ref(voucherCode.value);

watch(voucherCode, (code) => {
  voucherInput.value = code;
});

const increase = (id: string) => {
  cart.increase(id);
};

const decrease = (id: string) => {
  cart.decrease(id);
};

const remove = (id: string) => {
  cart.remove(id);
};

const applyVoucher = () => {
  cart.applyVoucher(voucherInput.value);
};
</script>

<template>
  <section class="cart-page">
    <header class="cart-mobile-header">
      <RouterLink to="/products" aria-label="Quay lại"><ArrowLeft :size="30" /></RouterLink>
      <h1>Giỏ hàng ({{ items.length }})</h1>
      <button type="button" aria-label="Tùy chọn"><MoreHorizontal :size="28" /></button>
    </header>

    <div class="sf-container cart-shell">
      <div class="cart-list">
        <div class="cart-desktop-title">
          <h1>Giỏ hàng</h1>
          <p>{{ items.length }} sản phẩm trong giỏ của bạn</p>
        </div>

        <article v-for="item in items" :key="item.id" class="cart-item">
          <img :src="item.product.image" :alt="item.product.name" />
          <div class="cart-item-main">
            <div class="cart-item-head">
              <div>
                <h2>{{ item.product.name }}</h2>
                <p>{{ item.variant }}</p>
              </div>
              <button type="button" aria-label="Xóa" @click="remove(item.id)"><X :size="22" /></button>
            </div>
            <div class="cart-item-bottom">
              <strong>{{ formatVnd(item.product.price) }}</strong>
              <div class="cart-qty">
                <button type="button" @click="decrease(item.id)"><Minus :size="16" /></button>
                <span>{{ item.quantity }}</span>
                <button type="button" @click="increase(item.id)"><Plus :size="16" /></button>
              </div>
            </div>
          </div>
        </article>

        <RouterLink class="continue-link" to="/products">
          <ArrowLeft :size="18" /> Tiếp tục mua sắm
        </RouterLink>
      </div>

      <aside class="cart-summary">
        <div class="voucher-box">
          <label>
            <Ticket :size="24" />
            <input v-model="voucherInput" placeholder="Nhập mã giảm giá" @keyup.enter="applyVoucher" />
          </label>
          <button type="button" :disabled="voucherApplying" @click="applyVoucher">
            {{ voucherApplying ? "Đang áp dụng" : "Áp dụng" }}
          </button>
          <p v-if="voucherMessage" class="voucher-message">{{ voucherMessage }}</p>
          <button v-if="voucherCode" type="button" class="clear-voucher" @click="cart.clearVoucher()">
            Bỏ mã {{ voucherCode }}
          </button>
        </div>

        <div class="summary-card">
          <h2>Tóm tắt đơn hàng</h2>
          <dl>
            <div>
              <dt>Tạm tính ({{ items.length }} sản phẩm)</dt>
              <dd>{{ formatVnd(subtotal) }}</dd>
            </div>
            <div>
              <dt>Phí vận chuyển</dt>
              <dd>{{ items.length ? "Tính ở bước thanh toán" : "0đ" }}</dd>
            </div>
            <div>
              <dt>Khuyến mãi</dt>
              <dd>{{ discount ? `-${formatVnd(discount)}` : "Chưa áp dụng" }}</dd>
            </div>
          </dl>
          <div class="summary-total">
            <span>Tổng cộng</span>
            <strong>{{ formatVnd(total) }}</strong>
          </div>
        </div>

        <RouterLink class="checkout-desktop sf-button" to="/checkout">
          Thanh toán <ArrowRight :size="18" />
        </RouterLink>
      </aside>
    </div>

    <div class="mobile-checkout-bar">
      <div>
        <span>Tổng thanh toán</span>
        <strong>{{ formatVnd(total) }}</strong>
      </div>
      <RouterLink to="/checkout">
        Thanh toán <ArrowRight :size="20" />
      </RouterLink>
    </div>

    <div v-if="!items.length" class="empty-cart sf-container">
      <Trash2 :size="42" />
      <h2>Giỏ hàng đang trống</h2>
      <RouterLink class="sf-button" to="/products">Khám phá sản phẩm</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.cart-page {
  min-height: calc(100vh - 72px);
  padding: 44px 0 120px;
  background: var(--sf-bg);
}

.cart-mobile-header {
  display: none;
}

.cart-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 34px;
  align-items: start;
}

.cart-desktop-title {
  margin-bottom: 24px;
}

.cart-desktop-title h1 {
  margin: 0;
  font-size: 42px;
  letter-spacing: -0.06em;
}

.cart-desktop-title p {
  color: var(--sf-muted);
}

.cart-list {
  display: grid;
  gap: 20px;
}

.cart-item,
.voucher-box,
.summary-card {
  border-radius: 22px;
  background: #fff;
}

.cart-item {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 24px;
  padding: 22px;
}

.cart-item img {
  width: 150px;
  height: 150px;
  border-radius: 12px;
  object-fit: cover;
}

.cart-item-main {
  min-width: 0;
  display: grid;
  align-content: space-between;
  gap: 24px;
}

.cart-item-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.cart-item h2 {
  margin: 0;
  font-size: 24px;
  letter-spacing: -0.03em;
}

.cart-item p {
  margin: 12px 0 0;
  color: var(--sf-muted);
  font-size: 18px;
}

.cart-item-head button,
.cart-qty button {
  border: none;
  background: transparent;
  color: #4b5563;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cart-item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.cart-item-bottom strong {
  font-size: 24px;
  letter-spacing: 0.08em;
}

.cart-qty {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  min-width: 170px;
  height: 56px;
  border-radius: 999px;
  background: #dce8f7;
  overflow: hidden;
}

.cart-qty span {
  text-align: center;
  font-size: 22px;
  font-weight: 800;
}

.continue-link {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  color: var(--sf-primary);
  font-weight: 800;
}

.cart-summary {
  position: sticky;
  top: 96px;
  display: grid;
  gap: 20px;
}

.voucher-box {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 14px;
  padding: 22px;
}

.voucher-box label {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  height: 58px;
  padding: 0 20px;
  border-radius: 12px;
  background: #dce8f7;
  color: var(--sf-muted);
}

.voucher-box input {
  min-width: 0;
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 18px;
}

.voucher-box button {
  border: none;
  border-radius: 12px;
  background: var(--sf-dark);
  color: #fff;
  font-size: 20px;
  font-weight: 900;
}

.voucher-box button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.voucher-message,
.clear-voucher {
  grid-column: 1 / -1;
}

.voucher-message {
  margin: -4px 0 0;
  color: var(--sf-primary);
  font-weight: 800;
}

.voucher-box .clear-voucher {
  justify-self: start;
  height: auto;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: #6b7280;
  font-size: 14px;
  text-decoration: underline;
}

.summary-card {
  padding: 34px;
}

.summary-card h2 {
  margin: 0 0 26px;
  font-size: 27px;
  letter-spacing: -0.04em;
}

.summary-card dl {
  display: grid;
  gap: 20px;
  margin: 0;
  padding-bottom: 26px;
  border-bottom: 1px solid var(--sf-line);
}

.summary-card dl div,
.summary-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.summary-card dt {
  color: var(--sf-muted);
  font-size: 18px;
}

.summary-card dd {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

.summary-card dd:last-child {
  color: var(--sf-primary);
}

.summary-total {
  margin-top: 28px;
}

.summary-total span {
  font-size: 22px;
  font-weight: 900;
}

.summary-total strong {
  color: var(--sf-accent);
  font-size: 30px;
  letter-spacing: 0.05em;
}

.checkout-desktop {
  min-height: 58px;
  font-size: 18px;
}

.mobile-checkout-bar {
  display: none;
}

.empty-cart {
  display: grid;
  justify-items: center;
  gap: 18px;
  padding: 80px 0;
  color: var(--sf-muted);
}

@media (max-width: 950px) {
  .cart-shell {
    grid-template-columns: 1fr;
  }

  .cart-summary {
    position: static;
  }
}

@media (max-width: 768px) {
  .cart-page {
    padding: 0 0 170px;
  }

  .cart-mobile-header {
    position: sticky;
    top: 0;
    z-index: 35;
    height: 86px;
    display: grid;
    grid-template-columns: 54px 1fr 54px;
    align-items: center;
    padding: 0 18px;
    border-bottom: 1px solid var(--sf-line);
    background: rgba(245, 247, 251, 0.96);
    backdrop-filter: blur(12px);
  }

  .cart-mobile-header h1 {
    margin: 0;
    color: var(--sf-accent);
    text-align: center;
    font-size: 28px;
    letter-spacing: -0.03em;
  }

  .cart-mobile-header button {
    border: none;
    background: transparent;
  }

  .cart-shell {
    width: calc(100% - 34px);
    gap: 18px;
    padding-top: 26px;
  }

  .cart-desktop-title,
  .continue-link,
  .checkout-desktop {
    display: none;
  }

  .cart-item {
    grid-template-columns: 150px 1fr;
    gap: 18px;
    padding: 24px 26px;
    border-radius: 18px;
  }

  .cart-item img {
    width: 150px;
    height: 150px;
  }

  .cart-item h2 {
    font-size: 24px;
  }

  .cart-item p {
    font-size: 19px;
  }

  .cart-item-bottom {
    display: grid;
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .voucher-box {
    grid-template-columns: 1fr 160px;
    padding: 22px 26px;
    border-radius: 18px;
  }

  .summary-card {
    padding: 30px 26px;
    border-radius: 18px;
  }

  .mobile-checkout-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 74px;
    z-index: 45;
    display: grid;
    grid-template-columns: 1fr 1.45fr;
    align-items: center;
    gap: 18px;
    padding: 18px 28px;
    background: #fff;
    border-top: 1px solid var(--sf-line);
  }

  .mobile-checkout-bar span,
  .mobile-checkout-bar strong {
    display: block;
  }

  .mobile-checkout-bar span {
    color: var(--sf-muted);
    font-size: 18px;
  }

  .mobile-checkout-bar strong {
    color: var(--sf-accent);
    font-size: 28px;
    letter-spacing: 0.05em;
  }

  .mobile-checkout-bar a {
    height: 72px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--sf-primary), var(--sf-accent));
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 22px;
    font-weight: 900;
  }
}

@media (max-width: 520px) {
  .cart-item {
    grid-template-columns: 120px 1fr;
    padding: 18px;
  }

  .cart-item img {
    width: 120px;
    height: 120px;
  }

  .cart-item h2 {
    font-size: 20px;
  }

  .cart-item p {
    font-size: 16px;
  }

  .cart-qty {
    min-width: 148px;
    height: 52px;
  }

  .voucher-box {
    grid-template-columns: 1fr;
  }

  .voucher-box button {
    height: 54px;
  }
}
</style>
