import { Request, Response } from "express";
import prisma from "@/configs/database";
import { CacheService } from "@/configs/cache.service";
import { APIResponse } from "@/shared/utils/response.util";

const cache = new CacheService();

export class SettingsController {
  /** GET /merchant/settings — Lấy thông tin profile tenant */
  getSettings = async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;

    const profile = await prisma.tenantProfile.findUnique({
      where: { tenant_id: tenantId },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, business_type: true, status: true },
    });

    res.status(200).json(
      APIResponse.OK("Lấy thông tin cài đặt", {
        slug: tenant?.slug,
        business_type: tenant?.business_type,
        store_name: profile?.store_name || "",
        store_description: profile?.store_description || "",
        owner_name: profile?.owner_name || "",
        phone: profile?.phone || "",
        email: profile?.email || "",
        address: profile?.address || "",
        tax_code: profile?.tax_code || "",
        logo_url: profile?.logo_url || "",
        favicon_url: profile?.favicon_url || "",
        primary_color: profile?.primary_color || "",
        secondary_color: profile?.secondary_color || "",
        banner_url: profile?.banner_url || "",
        homepage_sections: profile?.homepage_sections || "",
      }),
    );
  };

  /** PUT /merchant/settings — Cập nhật profile tenant */
  updateSettings = async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const {
      store_name,
      store_description,
      owner_name,
      phone,
      email,
      address,
      tax_code,
      logo_url,
      favicon_url,
      primary_color,
      secondary_color,
      banner_url,
      homepage_sections,
    } = req.body;

    const data: Record<string, any> = {};
    if (store_name !== undefined) data.store_name = store_name;
    if (store_description !== undefined) data.store_description = store_description;
    if (owner_name !== undefined) data.owner_name = owner_name;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (address !== undefined) data.address = address;
    if (tax_code !== undefined) data.tax_code = tax_code;
    if (logo_url !== undefined) data.logo_url = logo_url;
    if (favicon_url !== undefined) data.favicon_url = favicon_url;
    if (primary_color !== undefined) data.primary_color = primary_color;
    if (secondary_color !== undefined) data.secondary_color = secondary_color;
    if (banner_url !== undefined) data.banner_url = banner_url;
    if (homepage_sections !== undefined) data.homepage_sections = homepage_sections;

    const profile = await prisma.tenantProfile.upsert({
      where: { tenant_id: tenantId },
      update: data,
      create: { tenant_id: tenantId as string, ...data },
    });

    await cache.del(`shop-profile:${tenantId}`);

    // Cũng cập nhật store_name trên bảng tenant nếu trùng field
    if (store_name) {
      // TenantProfile.store_name is source of truth, no need to update Tenant table
    }

    res.status(200).json(APIResponse.OK("Cập nhật cài đặt thành công", profile));
  };
}
