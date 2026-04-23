export interface Category {
  id?: string;
  slug: string;
  name: string;
  caption: string;
  image: string;
  size?: "large" | "wide" | "small";
  children?: Category[];
}

export interface Product {
  id: string;
  variantId?: string;
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  price: number;
  oldPrice?: number;
  rating: number;
  ratingCount: number;
  image: string;
  badge?: string;
  colors?: string[];
  swatches?: Array<{
    label: string;
    value: string;
  }>;
  inStock: boolean;
  isNew?: boolean;
  description?: string | null;
  images?: string[];
  optionGroups?: Array<{
    key: string;
    label: string;
    type: "swatch" | "button";
    values: Array<{
      value: string;
      normalizedValue: string;
      variantIds: string[];
      inStock: boolean;
    }>;
  }>;
  variants?: Array<{
    id: string;
    label: string;
    price: number;
    stock: number;
    sku?: string;
    image?: string;
    values: Array<{
      attributeKey: string;
      attributeLabel: string;
      value: string;
      normalizedValue: string;
    }>;
  }>;
}

export const store = {
  name: "The Editorial Merchant",
  tagline: "Nâng tầm phong cách sống",
};

export const categories: Category[] = [
  {
    slug: "fashion",
    name: "Thời trang",
    caption: "Phong cách bền vững",
    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=900&q=80",
    size: "large",
  },
  {
    slug: "ceramic",
    name: "Gốm sứ",
    caption: "Vật dụng tinh giản",
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=700&q=80",
    size: "small",
  },
  {
    slug: "electronics",
    name: "Điện tử",
    caption: "Âm thanh và thiết bị",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80",
    size: "small",
  },
  {
    slug: "beauty",
    name: "Làm đẹp",
    caption: "Chăm sóc mỗi ngày",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
    size: "wide",
  },
];

export const products: Product[] = [
  {
    id: "p0",
    slug: "sofa-vai-ni-bac-au-hien-dai",
    name: "Sofa Vải Nỉ Bắc Âu Hiện Đại",
    category: "furniture",
    categoryLabel: "Nội thất",
    price: 8500000,
    oldPrice: 10000000,
    rating: 4.8,
    ratingCount: 124,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=85",
    badge: "-15%",
    colors: ["#e8ded4", "#aeb2ac", "#d8c6aa"],
    inStock: true,
    isNew: true,
  },
  {
    id: "p1",
    slug: "tai-nghe-blackwire-pro",
    name: "Tai nghe Blackwire Pro",
    category: "electronics",
    categoryLabel: "Âm thanh",
    price: 4290000,
    oldPrice: 5300000,
    rating: 4.8,
    ratingCount: 124,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    badge: "Bán chạy",
    colors: ["#111827", "#5f4b3f", "#e5e7eb"],
    inStock: true,
  },
  {
    id: "p2",
    slug: "ao-so-mi-linen-material",
    name: "Áo sơ mi Linen Material",
    category: "fashion",
    categoryLabel: "Thời trang",
    price: 2100000,
    rating: 4.7,
    ratingCount: 86,
    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80",
    inStock: true,
  },
  {
    id: "p3",
    slug: "bo-coc-gom-kyoto",
    name: "Bộ cốc gốm Kyoto",
    category: "ceramic",
    categoryLabel: "Gốm sứ",
    price: 850000,
    rating: 5,
    ratingCount: 42,
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=80",
    isNew: true,
    inStock: true,
  },
  {
    id: "p4",
    slug: "may-pha-ca-phe-ancona",
    name: "Máy pha cà phê Ancona",
    category: "electronics",
    categoryLabel: "Gia dụng",
    price: 1800000,
    oldPrice: 2400000,
    rating: 4.9,
    ratingCount: 76,
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
    badge: "-15%",
    inStock: true,
  },
  {
    id: "p5",
    slug: "ban-go-oak-curve",
    name: "Bàn gỗ Oak Curve",
    category: "furniture",
    categoryLabel: "Nội thất",
    price: 7200000,
    rating: 4.8,
    ratingCount: 54,
    image: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=800&q=80",
    inStock: true,
  },
  {
    id: "p6",
    slug: "den-ban-edison-copper",
    name: "Đèn bàn Edison Copper",
    category: "decor",
    categoryLabel: "Trang trí",
    price: 1250000,
    rating: 4.6,
    ratingCount: 38,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
    inStock: true,
  },
  {
    id: "p7",
    slug: "cay-xanh-concrete",
    name: "Chậu cây Concrete",
    category: "decor",
    categoryLabel: "Trang trí",
    price: 550000,
    rating: 4.9,
    ratingCount: 91,
    image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80",
    inStock: true,
  },
  {
    id: "p8",
    slug: "dong-ho-minimal",
    name: "Đồng hồ Wooden Minimal",
    category: "decor",
    categoryLabel: "Trang trí",
    price: 3400000,
    rating: 4.5,
    ratingCount: 33,
    image: "https://images.unsplash.com/photo-1507646227500-4d389b0012be?auto=format&fit=crop&w=800&q=80",
    inStock: false,
  },
];

export const galleryImages = [
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1400&q=85",
  "https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=85",
];

export const cartItems = [
  {
    id: "c1",
    product: products[3]!,
    variant: "Màu: Kem tự nhiên",
    quantity: 1,
  },
  {
    id: "c2",
    product: {
      ...products[5]!,
      name: "Sổ da bò nguyên bản",
      price: 820000,
      image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=700&q=85",
    },
    variant: "Kích thước: A5",
    quantity: 2,
  },
];

export const addresses = [
  {
    id: "a1",
    name: "Nguyễn Văn A",
    phone: "0912 345 678",
    address: "123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh",
    isDefault: true,
  },
  {
    id: "a2",
    name: "Trần Thị B",
    phone: "0987 654 321",
    address: "456 Tôn Đức Thắng, Phường Hàng Bột, Quận Đống Đa, Thành phố Hà Nội",
    isDefault: false,
  },
];

export const pickupStores = [
  {
    id: "s1",
    name: "The Editorial Merchant - Quận 1",
    address: "123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    phone: "028 3812 3456",
    hours: "08:00 - 22:00",
    distance: "1.2 km",
    status: "OPEN",
    selected: true,
  },
  {
    id: "s2",
    name: "The Editorial Merchant - Thảo Điền",
    address: "45 Xuân Thủy, Phường Thảo Điền, TP. Thủ Đức, TP. Hồ Chí Minh",
    phone: "028 3865 4321",
    hours: "07:30 - 21:30",
    distance: "3.5 km",
    status: "OPEN",
    selected: false,
  },
  {
    id: "s3",
    name: "The Editorial Merchant - Phú Mỹ Hưng",
    address: "Tầng trệt Crescent Mall, 101 Tôn Dật Tiên, Quận 7, TP. Hồ Chí Minh",
    phone: "028 3898 7654",
    hours: "Mở lúc 10:00",
    distance: "5.8 km",
    status: "CLOSED",
    selected: false,
  },
];

export const posts = [
  {
    title: "Sống tối giản trong trị liệu sống",
    category: "Phong cách sống",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Vật liệu tự chọn bền vững",
    category: "Vật liệu",
    image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Smart Home: công nghệ bao quanh cảm giác thật",
    category: "Công nghệ",
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80",
  },
];

export const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

export const editorialPosts = [
  {
    slug: "nghe-thuat-bai-tri-khong-gian-song-hien-dai",
    title: "Nghệ thuật bài trí không gian sống hiện đại",
    excerpt:
      "Khám phá những bí quyết sắp xếp nội thất tối giản nhưng đầy tinh tế, mang lại cảm giác bình yên và tối ưu hóa công năng cho căn hộ đô thị.",
    category: "Nổi bật",
    date: "15 Th10, 2023",
    comments: 24,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=85",
  },
  {
    slug: "hoi-tho-thu-cong-trong-khong-gian-song-hien-dai",
    title: "Hơi thở thủ công trong không gian sống hiện đại",
    excerpt: "Cách những nghệ nhân Việt đưa linh hồn của đất vào từng món đồ gốm, tạo nên điểm nhấn ấm áp cho không gian sống.",
    category: "Gốm sứ & Đời sống",
    date: "12 Th10, 2023",
    comments: 24,
    image: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&w=1000&q=85",
  },
  {
    slug: "chu-nghia-toi-gian-khi-it-la-nhieu",
    title: "Chủ nghĩa tối giản: Khi it là nhiều",
    excerpt: "Khám phá triết lý thiết kế loại bỏ những chi tiết thừa thãi, tập trung vào công năng và chất liệu.",
    category: "Thiết kế nội thất",
    date: "05 Th10, 2023",
    comments: 18,
    image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1000&q=85",
  },
  {
    slug: "tao-goc-doc-sach-tinh-lang-giua-long-pho-thi",
    title: "Tạo góc đọc sách tĩnh lặng giữa lòng phố thị",
    excerpt: "Chỉ cần một chiếc ghế bành êm ái, nguồn sáng vừa đủ và một mảng xanh nhỏ, bạn đã có thể tạo nên nơi trú ẩn riêng.",
    category: "Phong cách sống",
    date: "28 Th09, 2023",
    comments: 42,
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85",
  },
];

export const boutiques = [
  {
    id: "b1",
    name: "The Merchant - Tràng Tiền",
    shortName: "Tràng Tiền",
    address: "Số 1 Tràng Tiền, Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội",
    phone: "024 3934 3333",
    hours: "08:00 - 22:00",
    distance: "1.2 km",
    status: "OPEN",
    selected: true,
  },
  {
    id: "b2",
    name: "The Merchant - Lotte Center",
    shortName: "Lotte Center",
    address: "Tầng 1, Lotte Center, 54 Liễu Giai, Quận Ba Đình, Hà Nội",
    phone: "024 3333 8888",
    hours: "09:00 - 22:00",
    distance: "3.5 km",
    status: "OPEN",
  },
  {
    id: "b3",
    name: "The Merchant - Vincom Bà Triệu",
    shortName: "Vincom Bà Triệu",
    address: "Tầng 1, Vincom Center, 191 Bà Triệu, Quận Hai Bà Trưng, Hà Nội",
    phone: "024 3974 9999",
    hours: "09:30 - 21:30",
    distance: "6.8 km",
    status: "CLOSED",
  },
];
