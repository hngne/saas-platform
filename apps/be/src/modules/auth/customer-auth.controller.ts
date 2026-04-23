import { Request, Response, NextFunction } from "express";
import { BadRequestException } from "@/shared/exceptions";
import { APIResponse } from "@/shared/utils/response.util";
import { LogService } from "@/shared/services/log.service";
import logger from "@/configs/logger";
import { CustomerAuthService } from "./customer-auth.service";
import {
  CustomerLoginDto,
  CustomerRefreshDto,
  CustomerRegisterDto,
} from "./customer-auth.validator";

const service = new CustomerAuthService();

export class CustomerAuthController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = req.tenant;
      if (!tenant) throw new BadRequestException("Không xác định được cửa hàng");

      const dto = req.body as CustomerRegisterDto;
      const customer = await service.register(tenant.db_name, dto);

      logger.info(`POST ${req.originalUrl} - Customer register: ${dto.email}`, {
        tenant: tenant.slug,
        userId: customer.id,
        userType: "CUSTOMER",
      });
      LogService.activity(req, "REGISTER", "Customer", customer.id, { email: dto.email });

      res.status(201).json(APIResponse.Created("Đăng ký thành công", customer));
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = req.tenant;
      if (!tenant) throw new BadRequestException("Không xác định được cửa hàng");

      const dto = req.body as CustomerLoginDto;
      const result = await service.login(tenant.db_name, tenant.id, dto);

      logger.info(`POST ${req.originalUrl} - Customer login: ${dto.email}`, {
        tenant: tenant.slug,
        userId: result.user.id,
        userType: "CUSTOMER",
      });
      LogService.activity(req, "LOGIN", "Customer", result.user.id, { email: dto.email });

      res.status(200).json(APIResponse.OK("Đăng nhập thành công", result));
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = req.body as CustomerRefreshDto;
      const result = await service.refresh(dto.refreshToken);

      logger.info(`POST ${req.originalUrl} - Customer auto-login refresh`, {
        tenant: "customer",
        userId: result.user.id,
        userType: "CUSTOMER",
      });

      res.status(200).json(APIResponse.OK("Làm mới đăng nhập thành công", result));
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dbName = req.user?.dbName;
      const customerId = req.user?.sub;

      if (!dbName || !customerId) {
        throw new BadRequestException("Không có payload hợp lệ");
      }

      const profile = await service.getProfile(dbName, customerId);

      res.status(200).json(APIResponse.OK("Lấy thông tin thành công", profile));
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dbName = req.user?.dbName;
      const tenantId = req.user?.tenantId;
      const customerId = req.user?.sub;

      logger.info(`POST ${req.originalUrl} - Customer logout`, {
        tenant: tenantId,
        userId: customerId,
        userType: "CUSTOMER",
      });

      if (dbName && tenantId && customerId) {
        await service.logout(dbName, tenantId, customerId, req.body?.refreshToken);
      }

      res.status(200).json(APIResponse.OK("Đăng xuất thành công"));
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dbName = req.user?.dbName;
      const customerId = req.user?.sub;
      if (!dbName || !customerId) throw new BadRequestException("Không có payload hợp lệ");

      const result = await service.updateProfile(dbName, customerId, req.body);

      logger.info(`PUT ${req.originalUrl} - Update customer profile`, {
        tenant: req.user?.tenantId,
        userId: customerId,
        userType: "CUSTOMER",
      });

      res.status(200).json(APIResponse.OK("Cập nhật thông tin thành công", result));
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dbName = req.user?.dbName;
      const customerId = req.user?.sub;
      if (!dbName || !customerId) throw new BadRequestException("Không có payload hợp lệ");

      await service.changePassword(dbName, customerId, req.body);

      logger.info(`PUT ${req.originalUrl} - Customer change password`, {
        tenant: req.user?.tenantId,
        userId: customerId,
        userType: "CUSTOMER",
      });
      LogService.activity(req, "CHANGE_PASSWORD", "Customer", customerId);

      res.status(200).json(APIResponse.OK("Đổi mật khẩu thành công"));
    } catch (error) {
      next(error);
    }
  };
}
