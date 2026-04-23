import { Request, Response } from "express";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { CacheService } from "@/configs/cache.service";
import prisma from "@/configs/database";
import logger from "@/configs/logger";
import https from "https";

const cache = new CacheService();

/**
 * Haversine — Tính khoảng cách (km) giữa 2 tọa độ GPS.
 * Công thức chuẩn hàng không, sai số < 0.5% trên mặt đất.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class StorefrontInfoController {
  /** GET /storefront/shop-profile — Public: trả branding config cho customer storefront */
  getShopProfile = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const cacheKey = `shop-profile:${tenantId}`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(APIResponse.OK("Shop profile", cached));
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, business_type: true },
    });

    const profile = await prisma.tenantProfile.findUnique({
      where: { tenant_id: tenantId },
    });

    const data = {
      slug: tenant?.slug || "",
      store_name: profile?.store_name || tenant?.slug || "",
      store_description: profile?.store_description || "",
      logo_url: profile?.logo_url || "",
      favicon_url: profile?.favicon_url || "",
      banner_url: profile?.banner_url || "",
      primary_color: profile?.primary_color || "",
      secondary_color: profile?.secondary_color || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      address: profile?.address || "",
    };

    await cache.set(cacheKey, data, 600);
    res.status(200).json(APIResponse.OK("Shop profile", data));
  };

  /** Danh sách cửa hàng nhận hàng — cache 30 phút */
  getStores = async (req: Request, res: Response) => {
    const tid = req.tenant!.id;
    const cacheKey = `stores:${tid}:active`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(APIResponse.OK("Lấy danh sách cửa hàng thành công", cached));
    }

    const db = getTenantDB(req.tenant!.db_name);
    const data = await db.store.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
    });
    await cache.set(cacheKey, data, 1800);

    res.status(200).json(APIResponse.OK("Lấy danh sách cửa hàng thành công", data));
  };

  /**
   * Tìm cửa hàng gần nhất — sắp xếp theo khoảng cách so với tọa độ khách hàng.
   * Query params: ?lat=10.762622&lng=106.660172
   * Trả về danh sách stores kèm trường `distance_km`.
   */
  getNearestStores = async (req: Request, res: Response) => {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json(APIResponse.BadRequest("Vui lòng truyền tọa độ lat, lng hợp lệ"));
    }

    const db = getTenantDB(req.tenant!.db_name);
    const stores = await db.store.findMany({
      where: { is_active: true },
    });

    // Tính khoảng cách và sắp xếp
    const storesWithDistance = stores
      .filter((s) => s.latitude !== null && s.longitude !== null)
      .map((s) => ({
        ...s,
        distance_km: Math.round(
          haversineKm(lat, lng, Number(s.latitude), Number(s.longitude)) * 100
        ) / 100, // Làm tròn 2 chữ số thập phân
      }))
      .sort((a, b) => a.distance_km - b.distance_km);

    // Các store không có GPS → đẩy xuống cuối
    const storesNoGps = stores
      .filter((s) => s.latitude === null || s.longitude === null)
      .map((s) => ({ ...s, distance_km: null }));

    res.status(200).json(
      APIResponse.OK("Danh sách cửa hàng gần nhất", [...storesWithDistance, ...storesNoGps])
    );
  };

  /**
   * Reverse Geocode — Chuyển tọa độ GPS → địa chỉ text (Tỉnh, Huyện, Xã, Đường).
   * Dùng Nominatim (OpenStreetMap) — MIỄN PHÍ, không cần API key.
   * Query params: ?lat=10.762622&lng=106.660172
   */
  reverseGeocode = async (req: Request, res: Response) => {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json(APIResponse.BadRequest("Vui lòng truyền tọa độ lat, lng hợp lệ"));
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi&addressdetails=1`;

      const data: any = await new Promise((resolve, reject) => {
        https.get(url, { headers: { "User-Agent": "SaaS-Platform/1.0 (DATN Project)" } }, (resp) => {
          let body = "";
          resp.on("data", (chunk) => (body += chunk));
          resp.on("end", () => {
            try { resolve(JSON.parse(body)); } catch { reject(new Error("Invalid JSON from Nominatim")); }
          });
        }).on("error", reject);
      });

      const addr = data.address || {};

      // Parse kết quả Nominatim → cấu trúc chuẩn Việt Nam
      const result = {
        display_name: data.display_name || "",
        province: addr.city || addr.state || addr.province || "",
        district: addr.suburb || addr.county || addr.city_district || "",
        ward: addr.quarter || addr.village || addr.neighbourhood || "",
        road: addr.road || "",
        house_number: addr.house_number || "",
        address_detail: [addr.house_number, addr.road].filter(Boolean).join(" "),
        raw: addr,
      };

      res.status(200).json(APIResponse.OK("Tra cứu địa chỉ thành công", result));
    } catch (err: any) {
      logger.error(`[ReverseGeocode] Failed: ${err.message}`, {
        tenant: req.tenant?.slug || "unknown",
      });
      res.status(500).json(APIResponse.ServerError("Không thể tra cứu địa chỉ. Vui lòng thử lại."));
    }
  };

  /** Danh sách phương thức vận chuyển — cache 30 phút */
  getShippingMethods = async (req: Request, res: Response) => {
    const tid = req.tenant!.id;
    const cacheKey = `shipping:${tid}:active`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(APIResponse.OK("Lấy phương thức vận chuyển thành công", cached));
    }

    const db = getTenantDB(req.tenant!.db_name);
    const data = await db.shippingMethod.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
    });
    await cache.set(cacheKey, data, 1800);

    res.status(200).json(APIResponse.OK("Lấy phương thức vận chuyển thành công", data));
  };
}

