import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import { Store } from '@ngrx/store';

import {
  loadUsers,
  loadUsersSuccess,
  loadUsersFailure,
  updateUser,
  updateUserSuccess,
  updateUserFailure,
  deleteUser,
  deleteUserSuccess,
  deleteUserFailure,
  createUser,
  createUserSuccess,
  createUserFailure,
} from './users.actions';
import { UsersState, PaginationResult } from './users.actions';
import { AuthState, User } from '../auth/auth.actions';

@Injectable()
export class UsersEffects {
  private readonly API_URL = environment.apiUrl;

  // Use `inject()` so these are available during field initializers
  private actions$ = inject(Actions);
  private http = inject(HttpClient);
  private store = inject(Store) as Store<{ auth: AuthState; users: UsersState }>;

  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsers),
      withLatestFrom(this.store.select('auth')),
      switchMap(([action, authState]) => {
        if (!authState.accessToken) {
          return of(loadUsersFailure({ error: 'No access token' }));
        }

        const headers = new HttpHeaders({
          Authorization: `Bearer ${authState.accessToken}`,
        });

        const params: Record<string, string | number> = {
          page: action.page || 1,
          limit: action.limit || 10,
        };

        if (action.search) {
          params['q'] = action.search;
        }

        if (action.order) {
          params['order'] = action.order;
        }

        return this.http.get<PaginationResult>(`${this.API_URL}/users`, { headers, params }).pipe(
          map(result => loadUsersSuccess({ result, page: params['page'] as number, limit: params['limit'] as number })),
          catchError(error => of(loadUsersFailure({ error: error.error?.message || 'Failed to load users' })))
        );
      })
    )
  );

  updateUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateUser),
      withLatestFrom(this.store.select('auth')),
      switchMap(([action, authState]) => {
        if (!authState.accessToken) {
          return of(updateUserFailure({ error: 'No access token' }));
        }

        const headers = new HttpHeaders({
          Authorization: `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json',
        });

        return this.http.put<User>(`${this.API_URL}/users/${action.id}`, action.user, { headers }).pipe(
          map(user => updateUserSuccess({ user })),
          catchError(error => of(updateUserFailure({ error: error.error?.message || 'Failed to update user' })))
        );
      })
    )
  );

  deleteUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteUser),
      withLatestFrom(this.store.select('auth')),
      switchMap(([action, authState]) => {
        if (!authState.accessToken) {
          return of(deleteUserFailure({ error: 'No access token' }));
        }

        const headers = new HttpHeaders({
          Authorization: `Bearer ${authState.accessToken}`,
        });

        return this.http.delete<void>(`${this.API_URL}/users/${action.id}`, { headers }).pipe(
          map(() => deleteUserSuccess({ id: action.id })),
          catchError(error => of(deleteUserFailure({ error: error.error?.message || 'Failed to delete user' })))
        );
      })
    )
  );

  createUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createUser),
      withLatestFrom(this.store.select('auth')),
      switchMap(([action, authState]) => {
        if (!authState.accessToken) {
          return of(createUserFailure({ error: 'No access token' }));
        }

        const headers = new HttpHeaders({
          Authorization: `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json',
        });

        return this.http.post<User>(`${this.API_URL}/users`, action.user, { headers }).pipe(
          map(user => createUserSuccess({ user })),
          catchError(error => of(createUserFailure({ error: error.error?.message || 'Failed to create user' })))
        );
      })
    )
  );
}
