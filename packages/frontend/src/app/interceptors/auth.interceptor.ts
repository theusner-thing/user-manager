import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { logout, refreshTokenSuccess } from '../store/auth/auth.actions';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private store: Store, private http: HttpClient) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: any) => {
        // Only attempt refresh for 401 responses
        if (!err || err.status !== 401) {
          return throwError(() => err);
        }

        // Do not try to refresh if the request was the refresh call itself
        if (req.url.includes('/auth/refresh')) {
          try { this.store.dispatch(logout()); } catch (e) {}
          try { this.router.navigate(['/login']); } catch (e) {}
          return throwError(() => err);
        }

  // Obtain refresh token from store (once)
  return from(firstValueFrom(this.store.select((s: any) => s.auth))).pipe(
          switchMap((authState: any) => {
            const refreshToken = authState?.refreshToken;
            if (!refreshToken) {
              try { this.store.dispatch(logout()); } catch (e) {}
              try { this.router.navigate(['/login']); } catch (e) {}
              return throwError(() => err);
            }

            // attempt token refresh
            return this.http.post<any>(`${environment.apiUrl}/auth/refresh`, { refreshToken }).pipe(
              switchMap((resp: any) => {
                // dispatch refresh success so store updates
                try { this.store.dispatch(refreshTokenSuccess({ response: resp })); } catch (e) {}

                // retry original request with new token
                const newToken = resp?.access_token;
                if (newToken) {
                  const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
                  return next.handle(cloned);
                }

                // if no token in response, logout
                try { this.store.dispatch(logout()); } catch (e) {}
                try { this.router.navigate(['/login']); } catch (e) {}
                return throwError(() => err);
              }),
              // if refresh failed -> logout & redirect
              catchError((refreshErr: any) => {
                try { this.store.dispatch(logout()); } catch (e) {}
                try { this.router.navigate(['/login']); } catch (e) {}
                return throwError(() => refreshErr);
              })
            );
          })
        );
      })
    );
  }
}

export const authInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true,
};
