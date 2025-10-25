import { createAction, props } from '@ngrx/store';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  refreshExpiresAt: number | null;
  loading: boolean;
  error: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  expiresAt: number;
  refresh_token: string;
  refreshExpiresAt: number;
}

// Auth Actions
export const login = createAction('[Auth] Login', props<{ credentials: LoginRequest }>());
export const loginSuccess = createAction('[Auth] Login Success', props<{ response: LoginResponse; user: User }>());
export const loginFailure = createAction('[Auth] Login Failure', props<{ error: string }>());

export const refreshToken = createAction('[Auth] Refresh Token', props<{ refreshToken: string }>());
export const refreshTokenSuccess = createAction('[Auth] Refresh Token Success', props<{ response: LoginResponse }>());
export const refreshTokenFailure = createAction('[Auth] Refresh Token Failure', props<{ error: string }>());

export const logout = createAction('[Auth] Logout');
export const clearError = createAction('[Auth] Clear Error');
