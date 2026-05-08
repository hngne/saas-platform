<p align="center">
  <h1 align="center">🛒 ShopFlow</h1>
  <p align="center">Nền tảng SaaS Thương mại điện tử đa kênh</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

---

ShopFlow là một nền tảng **SaaS (Software as a Service)** cho phép người dùng khởi tạo và quản lý cửa hàng trực tuyến chỉ trong vài phút. Với cơ chế **Multi-tenancy**, mỗi cửa hàng có phân vùng dữ liệu riêng biệt và truy cập qua subdomain riêng (ví dụ: `shop-cua-toi.shopflow.vn`).

Dự án được phát triển như giải pháp toàn diện cho các doanh nghiệp vừa và nhỏ (SMEs) muốn chuyển đổi số nhanh chóng — tích hợp quản lý bán hàng, tồn kho, khuyến mãi và hỗ trợ từ **Trí tuệ nhân tạo (AI)**.

---

## 🏗️ Kiến trúc hệ thống

Dự án sử dụng **Monorepo**, quản lý đồng thời Backend và các ứng dụng Frontend:

```
saas-platform/
├── apps/
│   ├── be/             # Backend API (Express + Prisma)
│   ├── fe-landing/     # Trang giới thiệu & Đăng ký Tenant
│   ├── fe-admin/       # Portal Quản trị hệ thống (Super Admin)
│   ├── fe-store/       # Merchant CMS (Quản lý shop)
│   └── fe-customer/    # Storefront (Giao diện khách mua hàng)
├── docker/
│   └── nginx/          # Nginx Gateway config
├── docker-compose.yml  # Orchestration toàn bộ hệ thống
└── package.json        # Root scripts (chạy đồng thời tất cả)
```

---

## ✨ Tính năng nổi bật

### Chủ shop (Merchant CMS)
- Khởi tạo cửa hàng với subdomain riêng
- Quản lý sản phẩm đa biến thể (Size, Color), thuộc tính, danh mục
- Quản lý tồn kho realtime
- Hệ thống Voucher & khuyến mãi
- Dashboard thống kê doanh thu, đơn hàng (ApexCharts)
- Trợ lý AI (Google Gemini) — viết mô tả sản phẩm, tư vấn chiến lược
- Cấu hình giờ làm việc, địa chỉ pickup

### Khách hàng (Storefront)
- Giao diện mua sắm hiện đại, responsive
- Lọc sản phẩm theo danh mục, thuộc tính, giá
- Thanh toán: Giao hàng tận nơi / Nhận tại cửa hàng
- Đánh giá sản phẩm sau khi nhận hàng thành công

### Quản trị viên (Super Admin)
- Quản lý Tenant (các shop) trong hệ thống
- Quản lý danh mục dùng chung, gói dịch vụ

---

## 🔄 Luồng nghiệp vụ chính

```
1. Đăng ký shop (Landing Page)
   └─▸ Tạo subdomain + DB riêng cho shop

2. Quản trị shop (Merchant CMS)
   └─▸ Tạo Danh mục → Thuộc tính → Sản phẩm → Biến thể
   └─▸ Cấu hình vận chuyển, giờ làm việc
   └─▸ (Tùy chọn) Dùng AI Assistant viết mô tả

3. Mua hàng (Storefront)
   └─▸ Khách chọn sản phẩm → Áp voucher → Thanh toán
   └─▸ Chọn: Giao hàng hoặc Nhận tại shop

4. Xử lý đơn hàng
   └─▸ Chủ shop nhận thông báo realtime (Socket.io)
   └─▸ Xác nhận → Đang xử lý → Đã giao → Hoàn tất

5. Phản hồi
   └─▸ Khách đánh giá sản phẩm
   └─▸ Chủ shop theo dõi Dashboard thống kê
```

---

## 🛠️ Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| **Backend** | Node.js, Express.js, TypeScript |
| **ORM** | Prisma |
| **Database** | MySQL 8.0 (chính), MongoDB (logs), Redis (cache) |
| **AI** | Google Generative AI (Gemini) |
| **Realtime** | Socket.io |
| **Storage** | Cloudinary |
| **Frontend** | Vue 3, Vite, Pinia, PrimeVue, TailwindCSS 4 |
| **Charts** | ApexCharts |
| **Containerization** | Docker, Docker Compose, Nginx |

---

## 🚀 Hướng dẫn cài đặt

### Yêu cầu hệ thống
- **Node.js** >= 18
- **Docker & Docker Compose** (cho production hoặc chạy DB)

### Cách 1: Chạy Development (Local)

```bash
# 1. Clone repo
git clone https://github.com/hngne/saas-platform.git
cd saas-platform

# 2. Cài đặt dependencies (tất cả apps)
npm install
cd apps/be && npm install && cd ../..
cd apps/fe-store && npm install && cd ../..
cd apps/fe-customer && npm install && cd ../..
cd apps/fe-admin && npm install && cd ../..
cd apps/fe-landing && npm install && cd ../..

# 3. Khởi động Database bằng Docker
docker-compose up -d db redis mongodb

# 4. Cấu hình Backend
cp apps/be/.env.example apps/be/.env.development
# Mở file .env.development và điền các giá trị thật

# 5. Chạy Prisma Migrate
cd apps/be
npx prisma generate --schema=./prisma/schema.prisma
npx prisma generate --schema=./prisma-retail/schema.prisma
npx prisma migrate dev --schema=./prisma/schema.prisma
cd ../..

# 6. Chạy toàn bộ hệ thống
npm run dev
```

**Các cổng mặc định:**

| App | URL |
|-----|-----|
| Backend API | `http://localhost:8080` |
| Landing | `http://localhost:3000` |
| Customer | `http://localhost:3004` |
| Merchant CMS | `http://localhost:3002` |
| Admin | `http://localhost:3003` |

### Cách 2: Chạy Production (Docker)

```bash
# 1. Clone repo
git clone https://github.com/hngne/saas-platform.git
cd saas-platform

# 2. Cấu hình biến môi trường
cp .env.example .env
# Mở file .env và điền các giá trị thật (DB password, JWT secret, Cloudinary...)

# 3. Build và chạy toàn bộ
docker-compose up -d --build

# 4. Kiểm tra trạng thái
docker-compose ps
```

**Hệ thống Docker bao gồm:**

| Container | Mô tả | Port |
|-----------|--------|------|
| `saas_db` | MySQL 8.0 | 3306 |
| `saas_redis` | Redis (Cache) | 6379 |
| `saas_mongo` | MongoDB (Logs) | 27017 |
| `saas_be` | Backend API | 8080 |
| `saas_fe_landing` | Landing Page | — |
| `saas_fe_admin` | Admin Portal | — |
| `saas_fe_store` | Merchant CMS | — |
| `saas_fe_customer` | Storefront | — |
| `saas_proxy` | Nginx Gateway | 80 |

---

## ⚙️ Cấu hình Biến môi trường

> ⚠️ **KHÔNG BAO GIỜ** commit file `.env` chứa thông tin nhạy cảm lên Git.
> Chỉ commit file `.env.example` làm template.

### Backend (`apps/be/.env.development`)

```env
# Database
DB_PLATFORM_URL=mysql://root:password@localhost:3306/db_platform
RETAIL_DB_URL=mysql://root:password@localhost:3306/db_retail_template

# Auth
JWT_ACCESS_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_secret_here

# Storage
CLOUDINARY_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# AI (optional)
GEMINI_API_KEY=your_gemini_key
```

### Frontend (`apps/fe-*/.env`)

```env
VITE_API_URL=http://localhost:8080/api
VITE_SITE_DOMAIN=localhost:3004
```

### Docker (`/.env` — ở thư mục gốc)

```env
MYSQL_ROOT_PASSWORD=your_password
JWT_ACCESS_SECRET=your_secret
CLOUDINARY_NAME=your_name
# ... xem .env.example để biết đầy đủ
```

---

## 📂 Cấu trúc thư mục Backend

```text
apps/be/src/
├── modules/              # Logic nghiệp vụ theo tính năng
│   ├── product/          #   ├── product.controller.ts
│   │                     #   ├── product.service.ts
│   │                     #   └── product.repository.ts
│   ├── order/
│   ├── category/
│   ├── attribute/
│   ├── review/
│   ├── dashboard/
│   ├── ai/
│   └── ...
├── shared/               # Utilities, middleware, prisma client
├── middlewares/           # Auth, error handling, rate limiting
├── configs/              # Database, Redis, MongoDB, Socket.io
├── routers/              # Route declarations
├── app.ts                # Express app setup
└── server.ts             # Entry point
```

---

## 🛡️ Đồ án Tốt nghiệp

Dự án được thiết kế và thực hiện nhằm giải quyết bài toán vận hành hệ thống thương mại điện tử quy mô lớn, tối ưu hóa tài nguyên thông qua kiến trúc **Multi-tenancy** và nâng cao trải nghiệm người dùng bằng công nghệ **AI**.

**Người thực hiện:** Vũ Hùng  
**Version:** 1.0.0
