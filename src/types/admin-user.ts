/**
 * User roles
 */
export type UserRole = "admin" | "subadmin" | "client" | "investor";

/**
 * Admin User structure
 */
export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  password?: string;
  photoURL?: string;
  active: boolean;
  createdAt: string;
  lastLogin?: string | null;
  updatedAt?: string;
  firmName?: string;
  secureAccessToken?: string;
}

/**
 * Create Admin User Request
 */
export interface CreateAdminUserRequest {
  email: string;
  password: string;
  displayName: string;
  photoURL?: string;
}

/**
 * Update Admin User Request
 */
export interface UpdateAdminUserRequest {
  displayName?: string;
  photoURL?: string;
  active?: boolean;
  password?: string;
}

/**
 * Admin User API Response
 */
export interface AdminUserApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
