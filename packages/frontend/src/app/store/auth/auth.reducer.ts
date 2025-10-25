import { createReducer, on } from '@ngrx/store';
import {
  AuthState,
  login,
  loginSuccess,
  loginFailure,
  refreshTokenSuccess,
  refreshTokenFailure,
  logout,
  clearError,
} from './auth.actions';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  refreshExpiresAt: null,
  loading: false,
  error: null,
};

export const authReducer = createReducer(
  initialState,
  on(login, state => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loginSuccess, (state, { response, user }) => ({
    ...state,
    user,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: response.expiresAt,
    refreshExpiresAt: response.refreshExpiresAt,
    loading: false,
    error: null,
  })),
  on(loginFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(refreshTokenSuccess, (state, { response }) => ({
    ...state,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: response.expiresAt,
    refreshExpiresAt: response.refreshExpiresAt,
    loading: false,
    error: null,
  })),
  on(refreshTokenFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(logout, () => initialState),
  on(clearError, state => ({
    ...state,
    error: null,
  }))
);
