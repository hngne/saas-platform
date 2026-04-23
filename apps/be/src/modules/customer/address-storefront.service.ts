import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { AddressStorefrontRepository } from "./address-storefront.repository";
import { NotFoundException, BadRequestException } from "@/shared/exceptions";

export class AddressStorefrontService {
  private repo: AddressStorefrontRepository;

  constructor(db: RetailClient) {
    this.repo = new AddressStorefrontRepository(db);
  }

  async getAddresses(customerId: string) {
    return this.repo.findAddressesByCustomer(customerId);
  }

  async createAddress(customerId: string, data: any) {
    // Kiểm tra xem user đã có địa chỉ nào chưa
    const count = await this.repo.countAddresses(customerId);

    // Nếu gửi lên is_default = true, hoặc chưa có địa chỉ nào -> set is_default
    const shouldBeDefault = count === 0 || data.is_default === true;

    if (shouldBeDefault && count > 0) {
      await this.repo.clearDefaultAddress(customerId);
    }

    return this.repo.createAddress(customerId, {
      ...data,
      is_default: shouldBeDefault,
    });
  }

  async updateAddress(id: string, customerId: string, data: any) {
    const address = await this.repo.findAddressById(id, customerId);
    if (!address) {
      throw new NotFoundException("Không tìm thấy địa chỉ");
    }

    if (data.is_default === true && !address.is_default) {
      await this.repo.clearDefaultAddress(customerId);
    }

    return this.repo.updateAddress(id, customerId, data);
  }

  async deleteAddress(id: string, customerId: string) {
    const address = await this.repo.findAddressById(id, customerId);
    if (!address) {
      throw new NotFoundException("Không tìm thấy địa chỉ");
    }

    if (address.is_default) {
      // Nếu là cái mặc định, nhưng user muốn xoá, cho phép ko?
      // Thường shopee cho phép xoá địa chỉ mặc định nếu đó là địa chỉ DUY NHẤT. Ngược lại bắt set cái khác thành mặc định trước
      const count = await this.repo.countAddresses(customerId);
      if (count > 1) {
        throw new BadRequestException(
          "Không thể xóa địa chỉ mặc định. Vui lòng đặt địa chỉ khác làm mặc định trước."
        );
      }
    }

    await this.repo.deleteAddress(id, customerId);
    return true;
  }
}
