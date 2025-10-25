import { Routes } from '@angular/router';
import {AuthGuard} from "./core/guards/auth.guard";

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full',
    },
    {
        path: 'login',
        loadComponent: () => import('./components/auth/login/login.component').then(m => m.LoginComponent),
    },
    {
        path: 'users',
        loadComponent: () => import('./components/users/user-list/user-list.component').then(m => m.UserListComponent),
        canActivate: [AuthGuard],
    },
    {
        path: '**',
        redirectTo: '/login',
    },
];
