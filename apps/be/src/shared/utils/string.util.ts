export const removeVietnameseTones = (str: string): string => {
  if (!str) return str;
  return str
    .normalize("NFD") // tách dấu ra khỏi chữ (á → a + ́)
    .replace(/[\u0300-\u036f]/g, "") // xóa các dấu thanh
    .replace(/đ/g, "d") // xử lý đ/Đ thủ công
    .replace(/Đ/g, "D")
    .toLowerCase(); // về thường hết
};

export const buildSearchQuery = (keyword: string): string => {
  return removeVietnameseTones(keyword.trim());
};
