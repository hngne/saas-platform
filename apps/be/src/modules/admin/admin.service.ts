import { AdminRepository } from "./admin.repository";
import { NotFoundException } from "@/shared/exceptions";

const repo = new AdminRepository();

export class AdminService {
  getProfile = async (id: string) => {
    const admin = await repo.findById(id);
    if (!admin) throw new NotFoundException("Không tìm thấy admin");
    return admin;
  };

  getStats = async () => {
    return repo.getStats();
  };
}
