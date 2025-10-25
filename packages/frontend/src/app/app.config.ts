import {ApplicationConfig, importProvidersFrom, provideZoneChangeDetection, APP_INITIALIZER} from '@angular/core';
import {Store} from '@ngrx/store';
import {AuthState, LoginResponse, User, loginSuccess} from './store/auth/auth.actions';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import {provideStore} from "@ngrx/store";
import {provideEffects} from "@ngrx/effects";
import {HttpClientModule, HTTP_INTERCEPTORS} from "@angular/common/http";
import { authInterceptorProvider } from './interceptors/auth.interceptor';
import {provideStoreDevtools} from "@ngrx/store-devtools";
import {authReducer} from "./store/auth/auth.reducer";
import {usersReducer} from "./store/users/users.reducer";
import {AuthEffects} from "./store/auth/auth.effects";
import {UsersEffects} from "./store/users/users.effects";
import { provideAnimations } from "@angular/platform-browser/animations";

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideStore({
            auth: authReducer,
            users: usersReducer,
        }),
        provideEffects([AuthEffects, UsersEffects]),
        provideStoreDevtools({ maxAge: 25, logOnly: false }),
        // PrimeNG configuration: set the theme preset to Aura
        provideAnimations(),
        providePrimeNG({
            theme: {
                preset: Aura,
                options: { darkModeSelector: '.p-dark' },
            },
        }),
        // Ensure HttpClient is available to the standalone app
        importProvidersFrom(HttpClientModule),
    // global auth interceptor: redirect to login on 401
    authInterceptorProvider,
        // Restore session from sessionStorage if present and not older than 5 days
        {
            provide: APP_INITIALIZER,
            useFactory: (store: Store<{ auth: AuthState }>) => {
                return () => {
                    try {
                        const raw = sessionStorage.getItem('auth_session');
                        if (!raw) return;
                        const parsed = JSON.parse(raw) as { response: LoginResponse; user: User; savedAt: number };
                        const age = Date.now() - (parsed.savedAt || 0);
                        const maxAge = 5 * 24 * 60 * 60 * 1000; // 5 days in ms
                        if (age > maxAge) {
                            sessionStorage.removeItem('auth_session');
                            return;
                        }
                        // dispatch loginSuccess to populate store
                        store.dispatch(loginSuccess({ response: parsed.response, user: parsed.user }));
                    } catch (e) {
                        // ignore
                    }
                };
            },
            deps: [Store],
            multi: true,
        },
    ],
};
