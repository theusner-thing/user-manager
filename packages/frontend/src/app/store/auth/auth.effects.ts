import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { Store } from '@ngrx/store';

import {
  login,
  loginSuccess,
  loginFailure,
  refreshToken,
  refreshTokenSuccess,
  refreshTokenFailure,
  logout,
} from './auth.actions';
import { AuthState, LoginResponse, User } from './auth.actions';

@Injectable()
export class AuthEffects {
  private readonly API_URL = environment.apiUrl;

  // Use `inject()` so these are available during field initializers
  private actions$ = inject(Actions);
  private http = inject(HttpClient);
  private store = inject(Store) as Store<{ auth: AuthState }>;

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(login),
      switchMap(({ credentials }: { credentials: { email: string; password: string } }) =>
        this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials).pipe(
          switchMap((response: LoginResponse) => {
            // Decode JWT to get user info
            const tokenPayload: any = this.decodeJWT(response.access_token);
            const user: User = {
              id: (tokenPayload?.sub as unknown) as string,
              email: tokenPayload?.email,
              firstName: tokenPayload?.firstName,
              lastName: tokenPayload?.lastName,
              role: (tokenPayload?.role as unknown) as 'admin' | 'user',
            };
            return of(loginSuccess({ response, user }));
          }),
          catchError((error: any) => of(loginFailure({ error: error.error?.message || 'Login failed' })))
        )
      )
    )
  );

  refreshToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(refreshToken),
      switchMap(({ refreshToken }: { refreshToken: string }) =>
        this.http.post<LoginResponse>(`${this.API_URL}/auth/refresh`, { refresh_token: refreshToken }).pipe(
          map((response: LoginResponse) => refreshTokenSuccess({ response })),
          catchError((error: any) => of(refreshTokenFailure({ error: error.error?.message || 'Token refresh failed' })))
        )
      )
    )
  );

  // Persist session on loginSuccess
  persistSession$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loginSuccess),
  tap(({ response, user }: { response: LoginResponse; user: User }) => {
          try {
            const session = { response, user, savedAt: Date.now() };
            sessionStorage.setItem('auth_session', JSON.stringify(session));
          } catch (e) {
            // ignore storage errors
          }
        })
      ),
    { dispatch: false }
  );

  // Update stored tokens on refresh
  updateSessionOnRefresh$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(refreshTokenSuccess),
  tap(({ response }: { response: LoginResponse }) => {
          try {
            const raw = sessionStorage.getItem('auth_session');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            parsed.response = response;
            parsed.savedAt = Date.now();
            sessionStorage.setItem('auth_session', JSON.stringify(parsed));
          } catch (e) {
            // ignore
          }
        })
      ),
    { dispatch: false }
  );

  // Clear session on logout
  clearSession$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(logout),
        tap(() => {
          try {
            sessionStorage.removeItem('auth_session');
          } catch (e) {}
        })
      ),
    { dispatch: false }
  );

  private decodeJWT(token: string): Record<string, unknown> | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  }
}
