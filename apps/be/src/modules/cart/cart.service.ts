import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { CartRepository } from "./cart.repository";
import { AddCartItemDto } from "./cart.validator";

export class CartService {
  private repo: CartRepository;

  constructor(db: RetailClient) {
    this.repo = new CartRepository(db);
  }

  /** Lấy giỏ hàng hiện tại */
  getCart = async (customerId: string) => {
    const cart = await this.repo.findCartWithItems(customerId);
    if (!cart) return { items: [] };
    return cart;
  };

  /** Thêm sản phẩm vào giỏ */
  addItem = async (customerId: string, dto: AddCartItemDto) => {
    // Check variant tồn tại và còn hàng
    const variant = await this.repo.findVariant(dto.variant_id);
    if (!variant) throw new NotFoundException("Biến thể sản phẩm không tồn tại");
    if (!variant.product.is_active) throw new BadRequestException("Sản phẩm đã ngừng bán");
    if (!variant.is_active) throw new BadRequestException("Biến thể đã ngừng bán");
    if (variant.stock < dto.quantity) {
      throw new BadRequestException(`Chỉ còn ${variant.stock} sản phẩm trong kho`);
    }

    // Lấy hoặc tạo cart
    const cart = await this.repo.findOrCreateCart(customerId);

    // Nếu variant đã có trong giỏ → cộng dồn
    const existingItem = await this.repo.findCartItem(cart.id, dto.variant_id);
    if (existingItem) {
      const newQty = existingItem.quantity + dto.quantity;
      if (newQty > variant.stock) {
        throw new BadRequestException(`Chỉ còn ${variant.stock} sản phẩm trong kho`);
      }
      return this.repo.incrementItemQuantity(existingItem.id, dto.quantity);
    }

    return this.repo.createItem(cart.id, dto.variant_id, dto.quantity);
  };

  /** Cập nhật số lượng */
  updateItem = async (customerId: string, itemId: string, quantity: number) => {
    const cart = await this.repo.findOrCreateCart(customerId);
    const item = await this.repo.findCartItemById(itemId);

    if (!item || item.cart_id !== cart.id) {
      throw new NotFoundException("Không tìm thấy sản phẩm trong giỏ hàng");
    }

    const variant = await this.repo.findVariant(item.variant_id);
    if (variant && quantity > variant.stock) {
      throw new BadRequestException(`Chỉ còn ${variant.stock} sản phẩm trong kho`);
    }

    return this.repo.updateItemQuantity(itemId, quantity);
  };

  /** Xóa item khỏi giỏ */
  removeItem = async (customerId: string, itemId: string) => {
    const cart = await this.repo.findOrCreateCart(customerId);
    const item = await this.repo.findCartItemById(itemId);

    if (!item || item.cart_id !== cart.id) {
      throw new NotFoundException("Không tìm thấy sản phẩm trong giỏ hàng");
    }

    return this.repo.deleteItem(itemId);
  };
}
