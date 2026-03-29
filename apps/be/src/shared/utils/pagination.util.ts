// src/shared/utils/pagination.util.ts

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export const parsePagination = (query: any) => {
  return {
    page: Math.max(1, parseInt(query.page) || 1),
    limit: Math.min(100, parseInt(query.limit) || 20),
    search: (query.search as string) || undefined,
    sort_by: (query.sort_by as string) || "created_at",
    sort_order: (query.sort_order as "asc" | "desc") || "desc",
  };
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number,
) => {
  const total_pages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    total_pages,
    has_next: page < total_pages,
    has_prev: page > 1,
  };
};
