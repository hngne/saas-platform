// ─── Request types ──────────────────────────────────
export interface CreateAdminRequest {
  email: string;
  password: string;
  name?: string;
  role?: "ADMIN";
}

// ─── Response types ──────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AdminLoginResponse {
  admin: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  tokens: AuthTokens;
}

export interface UserLoginResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  tenant: {
    id: string;
    slug: string;
    businessType: string;
  };
  tokens: AuthTokens;
}

export interface MerchantRegisterResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  tenant: {
    id: string;
    slug: string;
    store_name: string | null;
  };
  tokens: AuthTokens;
}
