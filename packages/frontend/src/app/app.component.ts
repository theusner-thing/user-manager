import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Menubar } from 'primeng/menubar';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AuthState, User, logout } from './store/auth/auth.actions';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Menubar, ButtonModule, TooltipModule],
  templateUrl: 'app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'User Manager';
  user$: Observable<User | null>;
  isLoginRoute = false;

  constructor(private store: Store<{ auth: AuthState }>, private router: Router) {
    this.user$ = this.store.select((s: any) => s.auth.user);
    // initialize route flag and update on navigation end
    this.isLoginRoute = this.router.url.startsWith('/login') || this.router.url === '/';
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((ev: any) => {
      const url = ev.urlAfterRedirects || ev.url;
      this.isLoginRoute = url === '/login' || url.startsWith('/login');
    });
  }

  onLogout() {
    try {
      // clear stored session and dispatch logout
      sessionStorage.removeItem('auth_session');
    } catch (e) {
      // ignore
    }
    this.store.dispatch(logout());
    // navigate to login
    try {
      this.router.navigate(['/login']);
    } catch (e) {
      // ignore
    }
  }
}

