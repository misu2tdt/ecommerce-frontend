export type UserRole = "user" | "admin";

export interface CurrentUser {
  id: number;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  message: string;
  access_token: string;
}

export interface RegisterResponse extends CurrentUser {
  message: string;
}
