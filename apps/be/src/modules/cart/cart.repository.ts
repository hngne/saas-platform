import { PrismaClient as RetailClient } from "../../../generated/retail-client";

export class CartRepository {
  constructor(private db: RetailClient) {}

  /** Lấy hoặc tạo Cart cho customer */
  async findOrCreateCart(customerId: string) {
    let cart = await this.db.cart.findUnique({
      where: { customer_id: customerId },
    });
    if (!cart) {
      cart = await this.db.cart.create({
        data: { customer_id: customerId },
      });
    }
    return cart;
  }

  /** Lấy toàn bộ giỏ hàng kèm thông tin sản phẩm */
  async findCartWithItems(customerId: string) {
    return this.db.cart.findUnique({
      where: { customer_id: customerId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    is_active: true,
                    images: { take: 1, orderBy: { sort_order: "asc" } },
                    promotion_details: {
                      where: {
                        promotion: {
                          is_active: true,
                          OR: [
                            { start_date: null, end_date: null },
                            { start_date: { lte: new Date() }, end_date: { gte: new Date() } },
                          ],
                        },
                      },
                      include: { promotion: true },
                    },
                  },
                },
                variant_values: {
                  include: {
                    attribute_value: { include: { attribute: true } },
                  },
                },
              },
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
    });
  }

  /** Tìm item trong giỏ theo variant */
  async findCartItem(cartId: string, variantId: string) {
    return this.db.cartItem.findFirst({
      where: { cart_id: cartId, variant_id: variantId },
    });
  }

  /** Tìm item theo ID */
  async findCartItemById(itemId: string) {
    return this.db.cartItem.findUnique({ where: { id: itemId } });
  }

  /** Thêm item mới */
  async createItem(cartId: string, variantId: string, quantity: number) {
    return this.db.cartItem.create({
      data: { cart_id: cartId, variant_id: variantId, quantity },
    });
  }

  /** Cộng dồn số lượng */
  async incrementItemQuantity(itemId: string, quantity: number) {
    return this.db.cartItem.update({
      where: { id: itemId },
      data: { quantity: { increment: quantity } },
    });
  }

  /** Cập nhật số lượng */
  async updateItemQuantity(itemId: string, quantity: number) {
    return this.db.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  /** Xóa item */
  async deleteItem(itemId: string) {
    return this.db.cartItem.delete({ where: { id: itemId } });
  }

  /** Lấy thông tin variant (check tồn kho) */
  async findVariant(variantId: string) {
    return this.db.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { select: { id: true, name: true, is_active: true } },
      },
    });
  }
}
