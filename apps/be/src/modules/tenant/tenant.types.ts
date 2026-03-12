export interface TenantListQuery {
  page?: number;
  limit?: number;
  status?: "ACTIVE" | "BANNED";
  keyword?: string;
}

export interface UpdateTenantStatusRequest {
  status: "ACTIVE" | "BANNED";
}
