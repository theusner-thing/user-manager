import { createAction, props } from '@ngrx/store';
import { User } from '../auth/auth.actions';

export interface UsersState {
  users: User[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
}

export interface PaginationResult {
  items: User[];
  total: number;
}

// Users Actions
export const loadUsers = createAction(
  '[Users] Load Users',
  props<{ page?: number; limit?: number; search?: string; order?: string }>()
);
export const loadUsersSuccess = createAction(
  '[Users] Load Users Success',
  props<{ result: PaginationResult; page: number; limit: number }>()
);
export const loadUsersFailure = createAction('[Users] Load Users Failure', props<{ error: string }>());

export const updateUser = createAction('[Users] Update User', props<{ id: string; user: Partial<User> }>());
export const updateUserSuccess = createAction('[Users] Update User Success', props<{ user: User }>());
export const updateUserFailure = createAction('[Users] Update User Failure', props<{ error: string }>());

export const createUser = createAction('[Users] Create User', props<{ user: Partial<User> }>());
export const createUserSuccess = createAction('[Users] Create User Success', props<{ user: User }>());
export const createUserFailure = createAction('[Users] Create User Failure', props<{ error: string }>());

export const deleteUser = createAction('[Users] Delete User', props<{ id: string }>());
export const deleteUserSuccess = createAction('[Users] Delete User Success', props<{ id: string }>());
export const deleteUserFailure = createAction('[Users] Delete User Failure', props<{ error: string }>());

export const clearUsersError = createAction('[Users] Clear Error');
