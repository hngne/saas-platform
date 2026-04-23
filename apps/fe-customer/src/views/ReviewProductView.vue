<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, ImagePlus, ShoppingBag, Star, User } from "lucide-vue-next";
import {
  checkoutApi,
  findCustomerReview,
  getApiErrorMessage,
  reviewApi,
  type CustomerOrder,
  type ProductReview,
} from "@/api/customer";
import { useCustomerAuthStore } from "@/stores/customer-auth.store";
import { getStoreDisplayName } from "@/utils/storefront-brand";

const route = useRoute();
const router = useRouter();
const auth = useCustomerAuthStore();
const displayStoreName = computed(getStoreDisplayName);
const order = ref<CustomerOrder | null>(null);
const existingReview = ref<ProductReview | null>(null);
const rating = ref(5);
const comment = ref("");
const submitting = ref(false);
const loading = ref(false);
const errorMessage = ref("");
const placeholderImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23e8eef7'/%3E%3Cpath d='M220 410l96-120 82 74 108-132 122 178' stroke='%23b3c1d6' stroke-width='18' fill='none'/%3E%3Ccircle cx='294' cy='226' r='34' fill='none' stroke='%23b3c1d6' stroke-width='18'/%3E%3C/svg%3E";
const selectedItemId = computed(() => String(route.query.itemId || ""));
const productItem = computed(() => {
  if (!order.value?.items?.length) return null;
  return order.value.items.find((item) => item.id === selectedItemId.value) || order.value.items[0] || null;
});
const productImage = computed(() => productItem.value?.image || placeholderImage);
const productName = computed(() => productItem.value?.name || "Sản phẩm đã mua");
const productVariant = computed(() => productItem.value?.variant || "Mặc định");
const isReviewReadonly = computed(() => Boolean(existingReview.value));
const reviewTone = computed(() => {
  const value = existingReview.value?.rating || rating.value;
  if (value >= 5) return "Rất tốt";
  if (value >= 4) return "Hài lòng";
  if (value >= 3) return "Ổn";
  return "Cần cải thiện";
});

const loadOrder = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    await auth.fetchProfile().catch(() => null);
    order.value = await checkoutApi.getOrderById(String(route.params.id));

    const item = productItem.value;
    const customerId = auth.user?.id;
    if (!item?.productId || !order.value?.id || !customerId) {
      existingReview.value = null;
      return;
    }

    const reviewResult = await reviewApi.getByProduct(item.productId).catch(() => null);
    existingReview.value = reviewResult
      ? findCustomerReview(reviewResult.data, {
          customerId,
          orderId: order.value.id,
          productId: item.productId,
        })
      : null;

    if (existingReview.value) {
      rating.value = existingReview.value.rating;
      comment.value = existingReview.value.text || "";
    }
  } catch {
    order.value = null;
    existingReview.value = null;
    errorMessage.value = "Không thể tải thông tin đánh giá cho đơn hàng này.";
  } finally {
    loading.value = false;
  }
};

const submitReview = async () => {
  errorMessage.value = "";
  const item = productItem.value;
  if (existingReview.value) return;
  if (!item?.productId || !order.value?.id) {
    errorMessage.value = "Không tìm thấy sản phẩm hợp lệ để đánh giá.";
    return;
  }

  submitting.value = true;
  try {
    await reviewApi.create({
      product_id: item.productId,
      order_id: order.value.id,
      rating: rating.value,
      comment: comment.value.trim(),
      images: [],
    });
    await loadOrder();
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "Không thể gửi đánh giá.");
  } finally {
    submitting.value = false;
  }
};

onMounted(loadOrder);
</script>

<template>
  <section class="review-page theme-editorial">
    <header class="review-top">
      <RouterLink to="/" class="brand">{{ displayStoreName }}</RouterLink>
      <nav>
        <RouterLink to="/">Trang chủ</RouterLink>
        <RouterLink to="/products">Sản phẩm</RouterLink>
        <RouterLink class="active" to="/account/orders">Đơn hàng</RouterLink>
      </nav>
      <div><ShoppingBag :size="22" /><User :size="24" /></div>
    </header>

    <header class="mobile-head">
      <RouterLink to="/account/orders"><ArrowLeft :size="26" /></RouterLink>
      <h1>{{ isReviewReadonly ? "Xem đánh giá" : "Đánh giá sản phẩm" }}</h1>
      <span></span>
    </header>

    <main class="review-shell">
      <aside class="product-summary">
        <h1>{{ isReviewReadonly ? "Đánh giá của bạn" : "Đánh giá sản phẩm" }}</h1>
        <img :src="productImage" :alt="productName" />
        <h2>{{ productName }}</h2>
        <p>{{ productVariant }}</p>
      </aside>

      <section class="review-form">
        <article class="mobile-product">
          <img :src="productImage" :alt="productName" />
          <div>
            <h2>{{ productName }}</h2>
            <p>Phân loại: {{ productVariant }}</p>
          </div>
        </article>

        <p v-if="loading" class="review-state info">Đang tải đánh giá...</p>
        <p v-else-if="errorMessage" class="review-state error">{{ errorMessage }}</p>

        <template v-else-if="isReviewReadonly && existingReview">
          <section class="rating-block readonly">
            <h2>Đánh giá đã gửi</h2>
            <div>
              <Star v-for="i in 5" :key="i" :size="42" :class="{ muted: i > existingReview.rating }" fill="currentColor" />
              <span>{{ reviewTone }}</span>
            </div>
            <small>Gửi ngày {{ existingReview.date || "gần đây" }}</small>
          </section>

          <section class="saved-review">
            <h2>Nội dung đánh giá</h2>
            <p>{{ existingReview.text || "Bạn đã gửi đánh giá mà không để lại nhận xét chi tiết." }}</p>
          </section>

          <footer class="readonly-footer">
            <RouterLink to="/account/orders">Quay lại đơn hàng</RouterLink>
            <button type="button" @click="router.push(`/account/orders/${route.params.id}`)">Xem chi tiết đơn</button>
          </footer>
        </template>

        <template v-else>
          <section class="rating-block">
            <h2>Chất lượng sản phẩm</h2>
            <div>
              <Star v-for="i in 5" :key="i" :size="42" :class="{ muted: i > rating }" fill="currentColor" @click="rating = i" />
              <span>{{ reviewTone }}</span>
            </div>
          </section>

          <label class="review-text">
            <span>Chia sẻ trải nghiệm của bạn</span>
            <small>Comment sẽ được gửi lên module reviews của backend, không còn dữ liệu giả lập.</small>
            <textarea v-model="comment" maxlength="500" placeholder="Viết đánh giá của bạn ở đây..."></textarea>
            <em>{{ comment.length }}/500</em>
          </label>

          <section class="upload-block">
            <h2>Hình ảnh kèm theo</h2>
            <div class="upload-placeholder">
              <ImagePlus :size="28" />
              <div>
                <strong>Chưa kích hoạt upload ảnh từ storefront</strong>
                <span>API review đã sẵn sàng nhận `images[]`, nhưng FE sẽ nối uploader thật khi backend media flow ổn định.</span>
              </div>
            </div>
          </section>

          <footer>
            <RouterLink to="/account/orders">Quay lại</RouterLink>
            <button type="button" :disabled="submitting" @click="submitReview">{{ submitting ? "Đang gửi..." : "Gửi đánh giá" }}</button>
          </footer>
        </template>
      </section>
    </main>
  </section>
</template>

<style scoped>
.review-page {
  min-height: 100vh;
  background: var(--sf-bg);
}

.review-top {
  height: 78px;
  display: grid;
  grid-template-columns: 320px 1fr auto;
  align-items: center;
  padding: 0 30px;
  background: #fff;
  border-bottom: 1px solid var(--sf-line);
}

.brand {
  font-size: 25px;
  font-weight: 900;
}

.review-top nav {
  display: flex;
  justify-content: center;
  gap: 42px;
  font-size: 18px;
  font-weight: 800;
}

.review-top nav .active {
  color: var(--sf-accent);
  border-bottom: 2px solid var(--sf-accent);
}

.review-top div {
  display: flex;
  gap: 22px;
  color: var(--sf-accent);
}

.review-shell {
  display: grid;
  grid-template-columns: 0.42fr 1fr;
  gap: 36px;
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 48px 0 64px;
}

.product-summary,
.review-form {
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--sf-shadow-soft);
}

.product-summary {
  align-self: start;
  padding: 28px;
}

.product-summary h1 {
  margin: 0 0 24px;
  font-size: 28px;
}

.product-summary img,
.mobile-product img {
  width: 100%;
  aspect-ratio: 1 / 0.82;
  object-fit: cover;
  border-radius: 12px;
}

.product-summary h2 {
  margin: 20px 0 8px;
}

.product-summary p {
  margin: 0;
  color: var(--sf-muted);
}

.review-form {
  padding: 34px;
}

.rating-block h2,
.upload-block h2,
.saved-review h2,
.review-text span {
  display: block;
  margin: 0 0 18px;
  font-size: 24px;
  font-weight: 800;
}

.rating-block div {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--sf-accent);
}

.rating-block .muted {
  color: #dce8f7;
}

.rating-block span {
  color: var(--sf-primary);
  font-weight: 900;
}

.rating-block.readonly small {
  display: block;
  margin-top: 16px;
  color: var(--sf-muted);
  font-weight: 700;
}

.saved-review {
  margin-top: 34px;
  padding: 24px;
  border: 1px solid #dce8f7;
  border-radius: 14px;
  background: #f8fbff;
}

.saved-review p {
  margin: 0;
  line-height: 1.8;
  color: #334155;
}

.review-text {
  display: block;
  margin-top: 34px;
}

.review-text small {
  display: block;
  margin-bottom: 18px;
  color: #667085;
}

textarea {
  width: 100%;
  min-height: 180px;
  border: 1px solid #dce8f7;
  border-radius: 12px;
  background: #f8fbff;
  padding: 18px;
  outline: none;
  resize: vertical;
}

.review-text em {
  display: block;
  margin-top: 8px;
  text-align: right;
  color: #8c817b;
}

.upload-block {
  margin-top: 34px;
}

.upload-placeholder {
  min-height: 110px;
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 16px;
  align-items: center;
  padding: 18px;
  border: 2px dashed #e5c5b7;
  border-radius: 12px;
  background: #fff;
  color: var(--sf-primary);
}

.upload-placeholder strong,
.upload-placeholder span {
  display: block;
}

.upload-placeholder span {
  margin-top: 6px;
  color: var(--sf-muted);
  line-height: 1.6;
}

footer,
.readonly-footer {
  display: flex;
  gap: 14px;
  margin-top: 34px;
  padding-top: 24px;
  border-top: 1px solid #dce8f7;
}

footer a,
footer button,
.readonly-footer a,
.readonly-footer button {
  min-width: 180px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-weight: 900;
}

footer a,
.readonly-footer a {
  border: 1px solid var(--sf-line);
  color: var(--sf-primary);
}

footer button,
.readonly-footer button {
  border: none;
  background: var(--sf-primary);
  color: #fff;
}

footer button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.review-state {
  margin: 0 0 18px;
  font-weight: 800;
}

.review-state.info {
  color: #155ad1;
}

.review-state.error {
  color: var(--sf-danger);
}

.mobile-head,
.mobile-product {
  display: none;
}

@media (max-width: 900px) {
  .review-page {
    padding-bottom: 92px;
  }

  .review-top,
  .product-summary {
    display: none;
  }

  .mobile-head {
    height: 72px;
    display: grid;
    grid-template-columns: 40px 1fr 40px;
    align-items: center;
    padding: 0 18px;
    background: #fff;
    border-bottom: 1px solid var(--sf-line);
  }

  .mobile-head h1 {
    margin: 0;
    text-align: center;
    font-size: 22px;
  }

  .review-shell {
    display: block;
    width: calc(100% - 32px);
    padding-top: 24px;
  }

  .review-form {
    padding: 20px;
  }

  .mobile-product {
    display: grid;
    grid-template-columns: 96px 1fr;
    gap: 16px;
    align-items: center;
    margin-bottom: 28px;
  }

  .mobile-product img {
    height: 96px;
  }

  footer,
  .readonly-footer {
    display: grid;
  }

  footer a,
  footer button,
  .readonly-footer a,
  .readonly-footer button {
    width: 100%;
  }
}
</style>
