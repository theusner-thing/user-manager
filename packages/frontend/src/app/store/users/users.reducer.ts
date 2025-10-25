import { createReducer, on } from '@ngrx/store';
import {
  UsersState,
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
  clearUsersError,
} from './users.actions';

const initialState: UsersState = {
  users: [],
  loading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 10,
};

export const usersReducer = createReducer(
  initialState,
  on(loadUsers, (state, { page, limit }) => ({
    ...state,
    loading: true,
    error: null,
    page: page || state.page,
    limit: limit || state.limit,
  })),
  on(loadUsersSuccess, (state, { result, page, limit }) => ({
    ...state,
    users: result.items,
    total: result.total,
    page,
    limit,
    loading: false,
    error: null,
  })),
  on(loadUsersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(updateUser, state => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(updateUserSuccess, (state, { user }) => ({
    ...state,
    users: state.users.map(u => (u.id === user.id ? user : u)),
    loading: false,
    error: null,
  })),
  on(updateUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(createUser, state => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(createUserSuccess, (state, { user }) => ({
    ...state,
    users: [user, ...state.users],
    total: state.total + 1,
    loading: false,
    error: null,
  })),
  on(createUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(deleteUser, state => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(deleteUserSuccess, (state, { id }) => ({
    ...state,
    users: state.users.filter(u => u.id !== id),
    loading: false,
    error: null,
  })),
  on(deleteUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(clearUsersError, state => ({
    ...state,
    error: null,
  }))
);
